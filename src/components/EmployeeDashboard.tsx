import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { AssessmentData, AssessmentRecord, AssessmentScores } from '../types';
import TalentProfile from './TalentProfile';

export default function EmployeeDashboard() {
  const { currentUser, logout } = useAuth();
  const [record, setRecord] = useState<AssessmentRecord | undefined>();
  
  const [tools, setTools] = useState('');
  const [frequency, setFrequency] = useState('每週多次');
  const [botNames, setBotNames] = useState('');
  const [botCount, setBotCount] = useState<number>(0);
  const [scores, setScores] = useState<AssessmentScores>({
    textGeneration: 3, contentOrganization: 3,
    workEfficiency: 3, processOptimization: 3,
    analysis: 3, decisionSupport: 3,
    ideaGeneration: 3, professionalApplication: 3,
    structureDesign: 3, botConstruction: 3
  });
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [evidenceLink, setEvidenceLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const loadData = () => {
      if (currentUser) {
        const existing = dataService.getAssessmentByEmail(currentUser.email);
        if (existing) {
          setRecord(existing);
          if (existing.data && !hasLoadedRef.current) {
            setTools(existing.data.tools);
            setFrequency(existing.data.frequency);
            setBotNames(existing.data.botNames || '');
            setBotCount(existing.data.botCount || 0);
            setScores(existing.data.scores);
            setEvidenceDesc(existing.data.evidenceDesc);
            setEvidenceLink(existing.data.evidenceLink);
            hasLoadedRef.current = true;
          }
        }
      }
    };

    loadData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hr_ai_assessments') loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hr_data_changed', loadData);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('hr_data_changed', loadData);
    };
  }, [currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);

    const computed = dataService.computeAssessment(scores);
    const data: AssessmentData = {
      tools, frequency, botNames, botCount, scores, evidenceDesc, evidenceLink
    };

    const newRecord: AssessmentRecord = {
      userEmail: currentUser.email,
      status: 'Submitted',
      submittedAt: new Date().toISOString(),
      data,
      computed,
      // Retain supervisor review if exists
      supervisorReview: record?.supervisorReview
    };

    dataService.saveAssessment(newRecord).then(() => {
      setRecord(newRecord);
      setSubmitting(false);
      window.dispatchEvent(new Event('hr_data_changed'));
    }).catch(() => {
      alert('同步至後台失敗，請檢查網路連線。');
      setSubmitting(false);
    });
  };

  const scoreHints: Record<number, { label: string, hint: string }> = {
    1: { label: '觀望', hint: '知道概念，幾乎不會用。' },
    2: { label: '初學', hint: '可在他人指導下使用。' },
    3: { label: '獨立', hint: '能獨立完成日常應用。' },
    4: { label: '熟練', hint: '能熟練運用並穩定產出成果。' },
    5: { label: '可複製且優化', hint: '能優化方法、複製給他人、形成部門價值。' }
  };

  const renderSlider = (label: string, field: keyof AssessmentScores, desc: string) => (
    <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-white/60 shadow-sm flex flex-col justify-between group">
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-semibold text-slate-800">{label}</label>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md font-medium">
              {scoreHints[scores[field]].label}
            </span>
            <span className="text-blue-600 font-bold">{scores[field]}</span>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-500 mb-2">{desc}</p>
      </div>
      <div className="mt-auto">
        <input 
          type="range" min="1" max="5" step="1"
          value={scores[field]}
          disabled={record?.status === 'Reviewed'}
          onChange={(e) => setScores({ ...scores, [field]: parseInt(e.target.value) })}
          className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
        />
        <p className="text-[10px] text-blue-500/80 mt-1.5 font-medium min-h-[15px] italic">
          💡 {scoreHints[scores[field]].hint}
        </p>
      </div>
    </div>
  );

  if (record?.status === 'Reviewed' && currentUser) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
          <div>
             <h2 className="text-2xl font-bold tracking-tight text-slate-800">評核完成</h2>
             <p className="text-sm text-slate-500 mt-1">感謝參與，主管已完成您的 AI 職能覆核</p>
          </div>
          <button onClick={logout} className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">登出系統</button>
        </div>
        <TalentProfile record={record} user={currentUser} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">員工自評區</h2>
          <p className="text-sm text-slate-500 mt-1">哈囉, {currentUser?.name} ({currentUser?.title})</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Input Form */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Base info */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-l-4 border-blue-500 pl-2">1. 常用工具與頻率</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">常用 AI 工具</label>
                  <input type="text" value={tools} onChange={e => setTools(e.target.value)} disabled={record?.status === 'Reviewed'}
                    className="w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                    placeholder="例如：ChatGPT, Claude, Midjourney" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">使用頻率</label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)} disabled={record?.status === 'Reviewed'}
                    className="w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all">
                    <option>每日多次</option>
                    <option>每週多次</option>
                    <option>偶爾使用</option>
                    <option>幾乎不使用</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">常用機器人名稱</label>
                  <input type="text" value={botNames} onChange={e => setBotNames(e.target.value)} disabled={record?.status === 'Reviewed'}
                    className="w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                    placeholder="例如：HR助理、程式碼優化助手" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">機器人數量</label>
                  <input type="number" value={botCount} onChange={e => setBotCount(parseInt(e.target.value) || 0)} disabled={record?.status === 'Reviewed'}
                    className="w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all"
                    min="0" />
                </div>
              </div>
            </div>

            {/* 10 Indicators */}
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-blue-500 pl-2">2. 十項能力指標自評 (1~5分)</h3>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {Object.entries(scoreHints).map(([val, info]) => (
                    <div key={val} className="bg-white/80 px-2 py-1 rounded border border-slate-100 shadow-sm">
                      <span className="font-bold text-blue-600">{val}分</span> {info.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {renderSlider('文字生成', 'textGeneration', '能運用 AI 快速生成草稿或文案')}
                {renderSlider('內容整理', 'contentOrganization', '能請 AI 摘要、整理會議紀錄與長文')}
                {renderSlider('工作提效', 'workEfficiency', '利用 AI 節省日常瑣碎工作時間')}
                {renderSlider('流程優化', 'processOptimization', '改變既有工作流程，融入 AI 輔助')}
                {renderSlider('分析判讀', 'analysis', '讓 AI 協助分析報表、數據或競品')}
                {renderSlider('決策支援', 'decisionSupport', '依靠 AI 提供的見解進行決策判斷')}
                {renderSlider('創意生成', 'ideaGeneration', '透過 AI 發想行銷點子、活動企劃')}
                {renderSlider('專業應用', 'professionalApplication', '在程式、設計等專業領域深度使用')}
                {renderSlider('結構設計', 'structureDesign', '能系統化地建立 Prompt 系統或框架')}
                {renderSlider('自動化建置', 'botConstruction', '能建置機器人，或已可打造自動化工作流')}
              </div>
            </div>

            {/* Evidence */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4 border-l-4 border-blue-500 pl-2">3. 成果與證據 (選填，若需提升至 A/B 級則必填)</h3>
              <p className="text-xs text-slate-500 mb-3 -mt-3">A/B 級須至少附 1 項可回放證據（如無成果證明，最高評為 C 級）</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">量化成效說明</label>
                  <textarea value={evidenceDesc} onChange={e => setEvidenceDesc(e.target.value)} disabled={record?.status === 'Reviewed'}
                    className="w-full h-24 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-3 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                    placeholder="描述具體成效，如：節省每週工時 5 小時、品質提升... 等等" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">相關連結 / 附件位置 (可貼多個連結)</label>
                  <textarea value={evidenceLink} onChange={e => setEvidenceLink(e.target.value)} disabled={record?.status === 'Reviewed'}
                    className="w-full h-24 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-3 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400"
                    placeholder="您的產出檔案連結、SOP 連結或對話記錄分享 (一行一個連結)" />
                </div>
              </div>
            </div>

            {record?.status !== 'Reviewed' && (
              <div className="flex justify-end">
                <button type="submit" disabled={submitting}
                  className="px-6 py-2.5 bg-slate-800/90 backdrop-blur-md text-white rounded-xl font-semibold hover:bg-slate-900 shadow-md border border-slate-700/50 transition-all disabled:opacity-50">
                  送出評核
                </button>
              </div>
            )}
            
            {record?.status === 'Reviewed' && (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md text-sm">
                您的評核主管已覆核，無法再修改。
              </div>
            )}
          </form>
        </div>

        {/* Right: Results / Status */}
        <div className="lg:col-span-1 space-y-6">
          {record ? (
            <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">評核狀態</h3>
              
              <div className="flex flex-col items-center justify-center py-6 border-b border-slate-100">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl ${record.status === 'Reviewed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                   {record.status === 'Reviewed' ? '✓' : '...'}
                </div>
                <h4 className="font-semibold text-lg">{record.status === 'Reviewed' ? '已完成覆核' : '✅ 完成填寫！待主管覆核'}</h4>
                <p className="text-sm text-slate-500 mt-2 text-center">
                  {record.status === 'Reviewed' ? '主管已完成您的 AI 職能覆核作業。' : '評核資料已經成功送出，請靜待主管檢查。'}
                </p>
              </div>

              {record.supervisorReview && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-800 mb-4">主管覆核結果</h4>
                  <div className="bg-white/50 backdrop-blur-sm p-4 rounded-xl space-y-2 border border-white/60 shadow-sm">
                    <div className="flex justify-between items-center text-sm mb-3">
                      <span className="text-slate-500">最終評級</span>
                      <span className="font-bold text-blue-600 text-2xl">{record.supervisorReview.finalGrade} 級</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200 mt-2">
                      <span className="block text-xs text-slate-500 mb-1 mt-2">主管評語:</span>
                      <p className="text-sm text-slate-700">{record.supervisorReview.comments || '無'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/30 backdrop-blur-md rounded-2xl border border-dashed border-white/60 p-8 flex flex-col items-center justify-center text-center text-slate-500">
               尚未送出評核<br/><span className="text-xs mt-2">填寫送出後即可檢視狀態</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
