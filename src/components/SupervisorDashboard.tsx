import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { User, AssessmentRecord, SupervisorReview } from '../types';
import RadarProfile from './RadarProfile';
import TalentProfile from './TalentProfile';

export default function SupervisorDashboard() {
  const { currentUser, logout, users } = useAuth();
  const [teamRecords, setTeamRecords] = useState<{ user: User, record?: AssessmentRecord }[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<{ user: User, record?: AssessmentRecord }[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);

  // Filter states
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Reviewed'>('All');

  // Form states for review
  const [impactScore, setImpactScore] = useState(3);
  const [evidenceStatus, setEvidenceStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'None'>('None');
  const [comments, setComments] = useState('');

  const loadTeam = () => {
    const team = users.filter(u => u.supervisorEmail.trim().toLowerCase() === currentUser?.email.trim().toLowerCase());
    const assessments = dataService.getAssessments();
    
    const combined = team.map(u => {
      // 確保 record 擁有完整的 data 和 computed，若為空（可能是舊版資料或被手動刪除），則視為未填寫
      const record = assessments.find(a => a.userEmail === u.email && a.data && a.computed);
      return { user: u, record };
    });
    
    setTeamRecords(combined);
  };

  useEffect(() => {
    if (currentUser) {
      loadTeam();
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hr_ai_assessments' || e.key === 'hr_ai_users') {
        if (currentUser) loadTeam();
      }
    };
    const handleCustomChange = () => {
       if (currentUser) loadTeam();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hr_data_changed', handleCustomChange);
    const interval = setInterval(() => {
       if (currentUser) loadTeam();
    }, 3000);

    return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('hr_data_changed', handleCustomChange);
       clearInterval(interval);
    };
  }, [currentUser, users]);

  useEffect(() => {
    let result = teamRecords;
    if (filterCompany) result = result.filter(r => r.user.company === filterCompany);
    if (filterDept) result = result.filter(r => r.user.department === filterDept);
    if (filterStatus === 'Pending') result = result.filter(r => r.record && r.record.status === 'Submitted');
    if (filterStatus === 'Reviewed') result = result.filter(r => r.record && r.record.status === 'Reviewed');
    setFilteredRecords(result);
  }, [teamRecords, filterCompany, filterDept, filterStatus]);

  const openReview = (record: AssessmentRecord) => {
    setSelectedRecord(record);
    if (record.supervisorReview) {
      setImpactScore(record.supervisorReview.impactScore);
      setEvidenceStatus(record.supervisorReview.evidenceStatus);
      setComments(record.supervisorReview.comments);
    } else {
      setImpactScore(3);
      setEvidenceStatus((record.data?.evidenceLink || record.data?.evidenceDesc) ? 'Pending' : 'None');
      setComments('');
    }
  };

  const submitReview = () => {
    if (!selectedRecord || !selectedRecord.computed) return;

    const review: SupervisorReview = {
      impactScore,
      evidenceStatus,
      comments,
      reviewedAt: new Date().toISOString(),
      finalGrade: 'E'
    };

    review.finalGrade = dataService.calculateFinalGrade(selectedRecord.computed, review);

    const updatedRecord: AssessmentRecord = {
      ...selectedRecord,
      status: 'Reviewed',
      supervisorReview: review
    };

    dataService.saveAssessment(updatedRecord).then(() => {
      setSelectedRecord(null);
      loadTeam();
    }).catch(() => {
      alert('提交覆核失敗，請檢查網路連線。');
    });
  };

  const companies = Array.from(new Set(teamRecords.map(t => t.user.company))).filter(Boolean);
  const departments = Array.from(new Set(teamRecords.map(t => t.user.department))).filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">主管覆核儀表板</h2>
          <p className="text-sm text-slate-500 mt-1">哈囉, {currentUser?.name} (您團隊共有 {teamRecords.length} 人)</p>
        </div>
        <button onClick={logout} className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors mb-1">登出系統</button>
      </div>

      <div className="apple-glass-thin p-4 rounded-2xl border border-white/60 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">事業體 (事業部)</label>
          <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="w-full rounded-xl bg-white/80 border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option value="">全部事業體</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">部門</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full rounded-xl bg-white/80 border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option value="">全部部門</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">狀態</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="w-full rounded-xl bg-white/80 border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none">
            <option value="All">全部狀態</option>
            <option value="Pending">待評分 (已繳交)</option>
            <option value="Reviewed">已評分</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button onClick={() => { setFilterCompany(''); setFilterDept(''); setFilterStatus('All'); }} className="text-xs text-blue-600 hover:underline px-2 py-2">清除篩選</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 apple-glass-thin rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-0 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 bg-white/30 apple-glass-thin border-b border-white/40 flex justify-between items-center">
             <h3 className="font-semibold text-slate-800">團隊成員 ({filteredRecords.length})</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-white/20 apple-glass-thin">
            {filteredRecords.map((t, idx) => {
              const statusColor = !t.record ? 'bg-slate-100 text-slate-400' 
                                : t.record.status === 'Reviewed' ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700';
              const statusText = !t.record ? '未填寫' 
                               : t.record.status === 'Reviewed' ? `已評分 (${t.record.supervisorReview?.finalGrade})` 
                               : '待評分';

              return (
                <button 
                  key={idx} 
                  onClick={() => t.record && openReview(t.record)}
                  disabled={!t.record}
                  className={`w-full text-left p-3 rounded-xl border transition-all apple-glass-thin ${
                    selectedRecord?.userEmail === t.user.email 
                      ? 'bg-blue-100/50 border-blue-300 ring-1 ring-blue-400 shadow-sm' 
                      : 'bg-white/40 border-white/50 hover:bg-white/60 hover:shadow-sm'
                  } ${!t.record ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{t.user.name}</div>
                      <div className="text-[10px] text-slate-500">{t.user.department} | {t.user.title}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredRecords.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500">
                符合條件的成員不存在
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 apple-glass-thin rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-6 flex flex-col h-[700px] overflow-y-auto">
          {selectedRecord && selectedRecord.computed && selectedRecord.data ? (
            <div className="space-y-6">
              
              <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-bold text-slate-900">{users.find(u => u.email === selectedRecord.userEmail)?.name} 的 AI 職能自評</h3>
                    <span className="text-sm text-slate-500">人才型態：{selectedRecord.computed.talentType}</span>
                 </div>
                 <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">系統綜合分數</div>
                    <div className="text-2xl font-bold text-blue-600">{selectedRecord.computed.comprehensiveScore}</div>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <h4 className="font-semibold text-slate-800 mb-2 border-l-4 border-blue-500 pl-2 text-sm">自評雷達圖</h4>
                    <div className="bg-slate-50 rounded-lg p-2 h-64">
                      <RadarProfile computed={selectedRecord.computed} />
                    </div>
                 </div>
                 <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-slate-800 mb-2 border-l-4 border-blue-500 pl-2 text-sm">成果與證據</h4>
                      <div className="apple-glass-thin rounded-xl p-3 text-sm border border-white/60 h-64 overflow-y-auto space-y-3">
                         <div>
                           <div className="text-xs text-slate-500 font-medium">量化成效</div>
                           <p className="mt-1 text-slate-800">{selectedRecord.data.evidenceDesc || '未提報'}</p>
                         </div>
                          <div>
                            <div className="text-xs text-slate-500 font-medium">連結 / 附件</div>
                            {selectedRecord.data.evidenceLink ? (
                              <div className="mt-1 space-y-1">
                                {selectedRecord.data.evidenceLink.split('\n').filter(link => link.trim()).map((link, i) => (
                                  <a key={i} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} 
                                     target="_blank" rel="noopener noreferrer" 
                                     className="text-blue-600 hover:underline block break-all text-[11px] bg-blue-50/50 p-1 rounded border border-blue-100">
                                    🔗 {link.trim()}
                                  </a>
                                ))}
                              </div>
                            ) : <span className="mt-1 text-slate-800 block">未提供</span>}
                          </div>
                         <div>
                           <div className="text-xs text-slate-500 font-medium">常用工具</div>
                           <p className="mt-1 text-slate-800">{selectedRecord.data.tools} ({selectedRecord.data.frequency})</p>
                         </div>
                         <div>
                           <div className="text-xs text-slate-500 font-medium">自建機器人</div>
                           <p className="mt-1 text-slate-800">名稱：{selectedRecord.data.botNames || '未填寫'} / 數量：{selectedRecord.data.botCount || 0} 個</p>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>

              {selectedRecord.status === 'Reviewed' ? (
                 <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                       <h4 className="font-bold text-slate-800">最終簽核結果 - 數位名片預覽</h4>
                       <button onClick={() => {
                          const r = selectedRecord;
                          setImpactScore(r.supervisorReview?.impactScore || 3);
                          setEvidenceStatus(r.supervisorReview?.evidenceStatus as any || 'None');
                          setComments(r.supervisorReview?.comments || '');
                          setSelectedRecord({...r, status: 'Submitted' as any});
                       }} className="text-xs text-blue-600 hover:underline">重新修改覆核</button>
                    </div>
                    <div className="scale-75 -mx-[12.5%] -my-10 transform origin-top">
                      <TalentProfile record={selectedRecord} user={users.find(u => u.email === selectedRecord.userEmail)!} />
                    </div>
                 </div>
              ) : (
                 <div className="apple-glass-thin rounded-2xl p-5 border border-blue-200/50 shadow-sm mt-4">
                    <h4 className="font-semibold text-slate-800 mb-4 border-l-4 border-blue-600 pl-2">主管評分與判定</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                       <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">
                           1. 成果成熟度 (Impact)
                         </label>
                         <select value={impactScore} onChange={e => setImpactScore(Number(e.target.value))} className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm">
                            <option value={1}>1 - 幾近無產出</option>
                            <option value={2}>2 - 初步嘗試</option>
                            <option value={3}>3 - 能獨力量產</option>
                            <option value={4}>4 - 品質優良</option>
                            <option value={5}>5 - 跨部門典範</option>
                         </select>
                       </div>

                       <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">
                           2. 證據狀態審核
                         </label>
                         <select value={evidenceStatus} onChange={e => setEvidenceStatus(e.target.value as any)} className="w-full rounded-xl bg-white/50 border border-white/60 px-4 py-2.5 text-sm">
                            <option value="None">未提供</option>
                            <option value="Pending">待確認</option>
                            <option value="Rejected">不符合標準</option>
                            <option value="Approved">認可為有效證據</option>
                         </select>
                       </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">主管評語 (選填)</label>
                      <textarea value={comments} onChange={e => setComments(e.target.value)} className="w-full h-32 rounded-xl bg-white/50 border border-white/60 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none" placeholder="建議..."></textarea>
                    </div>

                    {(() => {
                      const grade = dataService.calculateFinalGrade(selectedRecord.computed, { evidenceStatus, impactScore });
                      const multiplier = 0.6 + (impactScore - 1) * (0.7 / 4);
                      const adjDepth = (selectedRecord.computed.depth * multiplier).toFixed(1);
                      const gradeColor: Record<string, string> = {
                        A: 'bg-purple-100 border-purple-300 text-purple-800',
                        B: 'bg-blue-100 border-blue-300 text-blue-800',
                        C: 'bg-emerald-100 border-emerald-300 text-emerald-800',
                        D: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                        E: 'bg-red-100 border-red-300 text-red-800',
                      };
                      return (
                        <div className={`flex justify-between items-center p-4 rounded-xl border-2 transition-all ${gradeColor[grade]}`}>
                          <div className="text-sm space-y-1">
                            <div className="font-semibold">
                              動態判定等級：
                              <span className="text-2xl font-black ml-2">{grade}</span>
                              <span className="text-sm font-normal ml-1">級</span>
                            </div>
                            <div className="text-[11px] opacity-70 space-x-3">
                              <span>員工得分 {selectedRecord.computed.comprehensiveScore}</span>
                              <span>·</span>
                              <span>調整後強項深度 {adjDepth}</span>
                              {evidenceStatus !== 'Approved' && selectedRecord.computed.comprehensiveScore >= 6.5 && (
                                <span className="text-red-600 font-bold">· 需有效證據才可升至 A/B</span>
                              )}
                            </div>
                          </div>
                          <button onClick={submitReview} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-900 transition-all whitespace-nowrap ml-4">
                             完成覆核並送出
                          </button>
                        </div>
                      );
                    })()}
                 </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
               請由左側選擇一位待覆核的員工
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
