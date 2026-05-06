import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { User, AssessmentRecord, SupervisorReview } from '../types';
import RadarProfile from './RadarProfile';
import TalentProfile from './TalentProfile';
import * as XLSX from 'xlsx';

export default function SupervisorDashboard() {
  const { currentUser, users } = useAuth();
  const [teamRecords, setTeamRecords] = useState<{ user: User, record?: AssessmentRecord }[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'overview' | 'talent'>('overview');
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);
  
  // Edit mode states
  const [isEditingData, setIsEditingData] = useState(false);
  const [editDataForm, setEditDataForm] = useState<any>(null);

  // Form states for review
  const [impactScore, setImpactScore] = useState(3);
  const [evidenceStatus, setEvidenceStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'None'>('None');
  const [comments, setComments] = useState('');

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  const loadTeam = () => {
    const team = users.filter(u => u.supervisorEmail.trim().toLowerCase() === currentUser?.email.trim().toLowerCase());
    const assessments = dataService.getAssessments();
    
    const combined = team.map(u => {
      const record = assessments.find(a => a.userEmail === u.email && a.data && a.computed);
      return { user: u, record };
    });
    
    setTeamRecords(combined);
  };

  useEffect(() => {
    if (currentUser) loadTeam();

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
    return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('hr_data_changed', handleCustomChange);
    };
  }, [currentUser, users]);

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
    setIsEditingData(false);
  };

  const handleSaveEditData = () => {
    if (!selectedRecord || !editDataForm) return;
    const computed = dataService.computeAssessment(editDataForm.scores);
    const updatedRecord: AssessmentRecord = {
      ...selectedRecord,
      data: {
        ...editDataForm,
        evidenceLink: editDataForm.evidenceLinks.filter((l: string) => l.trim()).join('\n')
      },
      computed
    };
    if (updatedRecord.supervisorReview) {
      updatedRecord.supervisorReview.finalGrade = dataService.calculateFinalGrade(computed, updatedRecord.supervisorReview);
    }
    dataService.saveAssessment(updatedRecord).then(() => {
      setSelectedRecord(updatedRecord);
      setIsEditingData(false);
      loadTeam();
    }).catch(() => alert('儲存修改失敗，請檢查網路連線。'));
  };

  const submitReview = () => {
    if (!selectedRecord || !selectedRecord.computed) return;
    const review: SupervisorReview = {
      impactScore, evidenceStatus, comments, reviewedAt: new Date().toISOString(), finalGrade: 'E'
    };
    review.finalGrade = dataService.calculateFinalGrade(selectedRecord.computed, review);
    const updatedRecord: AssessmentRecord = {
      ...selectedRecord, status: 'Reviewed', supervisorReview: review
    };
    dataService.saveAssessment(updatedRecord).then(() => {
      setSelectedRecord(null);
      loadTeam();
    }).catch(() => alert('提交覆核失敗，請檢查網路連線。'));
  };

  const filteredTeam = teamRecords.filter(t => 
    t.user.name.includes(searchTerm) || t.user.department.includes(searchTerm) || t.user.email.includes(searchTerm)
  );

  const stats = {
    total: teamRecords.length,
    completed: teamRecords.filter(t => t.record).length,
    pendingReview: teamRecords.filter(t => t.record?.status === 'Submitted').length,
    reviewed: teamRecords.filter(t => t.record?.status === 'Reviewed').length,
  };
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // 如果選擇了某個員工，則顯示詳細審查畫面
  if (selectedRecord) {
    return (
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white p-6 shadow-xl relative min-h-[800px] overflow-y-auto">
        <button onClick={() => setSelectedRecord(null)} className="absolute top-6 left-6 text-slate-400 hover:text-slate-800 flex items-center gap-2 font-medium bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors">
          ← 返回列表
        </button>
        <div className="max-w-5xl mx-auto pt-14">
          {/* Detail View Reused from Previous implementation */}
          <div className="border-b border-slate-200 pb-4 flex justify-between items-center mb-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                {users.find(u => u.email === selectedRecord.userEmail)?.name} 的 AI 職能評核明細
                {!isEditingData && selectedRecord.status !== 'Reviewed' && (
                  <button 
                    onClick={() => {
                      setEditDataForm({
                        ...selectedRecord.data,
                        evidenceLinks: selectedRecord.data?.evidenceLink ? selectedRecord.data.evidenceLink.split('\n') : ['']
                      });
                      setIsEditingData(true);
                    }}
                    className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 shadow-sm"
                  >
                    ✏️ 修改員工提報資料
                  </button>
                )}
              </h3>
              <span className="text-sm text-slate-500 mt-1 block">人才型態：{selectedRecord.computed?.talentType}</span>
            </div>
            <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">系統綜合分數</div>
              <div className="text-3xl font-black text-violet-600">{selectedRecord.computed?.comprehensiveScore}</div>
            </div>
          </div>

          {isEditingData && editDataForm ? (
            <div className="animate-in fade-in space-y-6 bg-white p-8 rounded-2xl border-2 border-violet-200 shadow-lg relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-violet-500 rounded-t-2xl"></div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h4 className="font-bold text-lg text-slate-800">修改員工提報內容</h4>
                <div className="space-x-3">
                  <button onClick={() => setIsEditingData(false)} className="px-4 py-2 text-sm bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors">取消</button>
                  <button onClick={handleSaveEditData} className="px-5 py-2 text-sm bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-md shadow-violet-200 transition-all">儲存變更</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">常用工具</label>
                  <input type="text" value={editDataForm.tools} onChange={e => setEditDataForm({...editDataForm, tools: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 text-sm bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">頻率</label>
                  <select value={editDataForm.frequency} onChange={e => setEditDataForm({...editDataForm, frequency: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 text-sm bg-slate-50 focus:bg-white transition-colors">
                    <option>每日多次</option>
                    <option>每週多次</option>
                    <option>偶爾使用</option>
                    <option>幾乎不使用</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">量化成效說明</label>
                  <textarea value={editDataForm.evidenceDesc} onChange={e => setEditDataForm({...editDataForm, evidenceDesc: e.target.value})} className="w-full p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-violet-500 text-sm h-24 bg-slate-50 focus:bg-white transition-colors" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-2">相關連結 / 附件位置 (多欄位)</label>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {editDataForm.evidenceLinks.map((link: string, index: number) => (
                      <div key={index} className="flex gap-2">
                        <input type="text" value={link} onChange={e => {
                          const newLinks = [...editDataForm.evidenceLinks];
                          newLinks[index] = e.target.value;
                          setEditDataForm({...editDataForm, evidenceLinks: newLinks});
                        }} className="flex-1 p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-violet-500 text-sm bg-white shadow-sm" placeholder="輸入連結 URL..." />
                        {editDataForm.evidenceLinks.length > 1 && (
                          <button type="button" onClick={() => setEditDataForm({...editDataForm, evidenceLinks: editDataForm.evidenceLinks.filter((_:any, i:number) => i !== index)})} className="px-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg border border-slate-200 bg-white transition-colors shadow-sm">
                            🗑️
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => setEditDataForm({...editDataForm, evidenceLinks: [...editDataForm.evidenceLinks, '']})} className="text-sm font-medium text-violet-700 bg-violet-100 px-4 py-2 rounded-lg border border-violet-200 hover:bg-violet-200 transition-colors shadow-sm inline-flex items-center gap-1">
                      <span className="text-lg leading-none">+</span> 新增連結欄位
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h5 className="font-bold text-slate-700 text-sm mb-3">修改十項能力分數 (1-5分)</h5>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {Object.keys(editDataForm.scores).map(key => (
                    <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                      <label className="block text-xs font-medium text-slate-500 mb-2">{key === 'textGeneration' ? '文字生成' : key === 'contentOrganization' ? '內容整理' : key === 'workEfficiency' ? '工作提效' : key === 'processOptimization' ? '流程優化' : key === 'analysis' ? '分析判讀' : key === 'decisionSupport' ? '決策支援' : key === 'ideaGeneration' ? '創意生成' : key === 'professionalApplication' ? '專業應用' : key === 'structureDesign' ? '結構設計' : '自動化建置'}</label>
                      <input type="number" min="1" max="5" value={editDataForm.scores[key]} onChange={e => setEditDataForm({...editDataForm, scores: {...editDataForm.scores, [key]: parseInt(e.target.value) || 1}})} className="w-16 p-2 rounded-lg font-bold text-base text-center border-slate-300 focus:ring-2 focus:ring-violet-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div>
                    <h4 className="font-bold text-slate-800 mb-3 text-lg flex items-center gap-2"><span className="text-violet-500">❖</span> 自評雷達圖</h4>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 h-80">
                      {selectedRecord.computed && <RadarProfile computed={selectedRecord.computed} />}
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h4 className="font-bold text-slate-800 mb-3 text-lg flex items-center gap-2"><span className="text-violet-500">❖</span> 成果與證據</h4>
                    <div className="bg-white rounded-2xl p-5 text-sm border border-slate-100 h-80 overflow-y-auto space-y-4 shadow-sm">
                       <div>
                         <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">量化成效</div>
                         <p className="mt-1.5 text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedRecord.data?.evidenceDesc || '未提報'}</p>
                       </div>
                        <div>
                          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">連結 / 附件</div>
                          {selectedRecord.data?.evidenceLink ? (
                            <div className="mt-1.5 space-y-2">
                              {selectedRecord.data.evidenceLink.split('\n').filter(link => link.trim()).map((link, i) => (
                                <a key={i} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} 
                                   target="_blank" rel="noopener noreferrer" 
                                   className="text-violet-600 hover:text-violet-700 hover:underline block break-all text-sm bg-violet-50 p-2.5 rounded-lg border border-violet-100 flex items-center gap-2 transition-colors">
                                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                  {link.trim()}
                                </a>
                              ))}
                            </div>
                          ) : <span className="mt-1.5 text-slate-500 block bg-slate-50 p-3 rounded-lg border border-slate-100">未提供</span>}
                        </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">常用工具</div>
                           <p className="mt-1.5 text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedRecord.data?.tools || '無'} <span className="text-xs text-slate-500 font-normal ml-1">({selectedRecord.data?.frequency})</span></p>
                         </div>
                         <div>
                           <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">自建機器人</div>
                           <p className="mt-1.5 text-slate-800 font-medium bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedRecord.data?.botCount || 0} 個 <span className="text-xs text-slate-500 font-normal ml-1">({selectedRecord.data?.botNames || '未填寫'})</span></p>
                         </div>
                       </div>
                    </div>
                 </div>
              </div>

              {selectedRecord.status === 'Reviewed' ? (
                 <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                       <h4 className="font-black text-slate-800 text-xl">✨ 最終簽核結果預覽</h4>
                       <button onClick={() => {
                          const r = selectedRecord;
                          setImpactScore(r.supervisorReview?.impactScore || 3);
                          setEvidenceStatus(r.supervisorReview?.evidenceStatus as any || 'None');
                          setComments(r.supervisorReview?.comments || '');
                          setSelectedRecord({...r, status: 'Submitted' as any});
                       }} className="text-sm text-violet-600 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-xl font-medium transition-colors border border-violet-100 shadow-sm">✏️ 重新修改覆核</button>
                    </div>
                    <div className="scale-[0.85] transform origin-top -mt-8 -mb-16">
                      <TalentProfile record={selectedRecord} user={users.find(u => u.email === selectedRecord.userEmail)!} />
                    </div>
                 </div>
              ) : (
                 <div className="bg-white rounded-3xl p-8 border-2 border-violet-100 shadow-xl mt-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                    <h4 className="font-black text-slate-800 text-xl mb-6 flex items-center gap-2"><span className="text-violet-500">📝</span> 主管評分與判定</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <label className="block text-sm font-bold text-slate-700 mb-2">
                           1. 成果成熟度 (Impact)
                         </label>
                         <select value={impactScore} onChange={e => setImpactScore(Number(e.target.value))} className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 shadow-sm">
                            <option value={1}>1 - 幾近無產出</option>
                            <option value={2}>2 - 初步嘗試</option>
                            <option value={3}>3 - 能獨力量產</option>
                            <option value={4}>4 - 品質優良</option>
                            <option value={5}>5 - 跨部門典範</option>
                         </select>
                       </div>

                       <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <label className="block text-sm font-bold text-slate-700 mb-2">
                           2. 證據狀態審核
                         </label>
                         <select value={evidenceStatus} onChange={e => setEvidenceStatus(e.target.value as any)} className="w-full rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 shadow-sm">
                            <option value="None">未提供</option>
                            <option value="Pending">待確認</option>
                            <option value="Rejected">不符合標準</option>
                            <option value="Approved">認可為有效證據</option>
                         </select>
                       </div>
                    </div>

                    <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="block text-sm font-bold text-slate-700 mb-2">主管評語 (選填)</label>
                      <textarea value={comments} onChange={e => setComments(e.target.value)} className="w-full h-24 rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-violet-500 shadow-sm" placeholder="給予員工的建議與回饋..."></textarea>
                    </div>

                    {(() => {
                      const grade = dataService.calculateFinalGrade(selectedRecord.computed!, { evidenceStatus, impactScore });
                      const multiplier = 0.6 + (impactScore - 1) * (0.7 / 4);
                      const adjDepth = (selectedRecord.computed!.depth * multiplier).toFixed(1);
                      const gradeColor: Record<string, string> = {
                        A: 'bg-gradient-to-r from-purple-100 to-fuchsia-100 border-purple-300 text-purple-900',
                        B: 'bg-gradient-to-r from-blue-100 to-indigo-100 border-blue-300 text-blue-900',
                        C: 'bg-gradient-to-r from-emerald-100 to-teal-100 border-emerald-300 text-emerald-900',
                        D: 'bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-300 text-yellow-900',
                        E: 'bg-gradient-to-r from-red-100 to-rose-100 border-red-300 text-red-900',
                      };
                      return (
                        <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all shadow-md ${gradeColor[grade]}`}>
                          <div className="space-y-1">
                            <div className="font-bold text-sm opacity-80">動態判定結果</div>
                            <div className="font-black text-3xl flex items-baseline gap-1">
                              <span translate="no">{grade}</span>
                              <span className="text-base font-bold opacity-80">級</span>
                            </div>
                            <div className="text-xs font-medium opacity-70 mt-1 flex gap-3">
                              <span>員工得分 {selectedRecord.computed!.comprehensiveScore}</span>
                              <span>強項深度 {adjDepth}</span>
                            </div>
                            {evidenceStatus !== 'Approved' && selectedRecord.computed!.comprehensiveScore >= 6.5 && (
                                <div className="text-xs text-red-600 font-bold mt-1">⚠️ 需有「認可為有效證據」才可升至 A/B 級</div>
                            )}
                          </div>
                          <button onClick={submitReview} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold text-base hover:bg-black shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-0.5">
                             ✅ 完成覆核並送出
                          </button>
                        </div>
                      );
                    })()}
                 </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Sidebar Layout
  return (
    <div className="flex h-[calc(100vh-80px)] -mx-6 -my-6 bg-[#F4F6F8]">
      {/* Left Sidebar (AIPEX OSG Style) */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-violet-200">AI</div>
            <span className="font-black text-slate-800 text-lg tracking-tight">東森集團人才評核</span>
          </div>
        </div>
        
        <div className="px-6 py-2">
          <div className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">功能選單</div>
          <nav className="space-y-1.5">
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              評核總覽
            </button>
            <button onClick={() => setActiveTab('team')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              團隊管理
            </button>
            <button onClick={() => setActiveTab('talent')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'talent' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
              團隊人才庫
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header Equivalent */}
        <div className="px-8 py-6">
          <h2 className="text-2xl font-bold text-slate-800">
            {activeTab === 'overview' ? '評核總覽' : activeTab === 'team' ? '團隊管理' : '人才庫'}
          </h2>
          {activeTab === 'overview' && <p className="text-sm text-slate-500 mt-1">監控團隊評核參與進度、核定狀況與分數分佈</p>}
        </div>

        <div className="px-8 pb-8 space-y-6">
          
          {/* Dashboard Stats */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-1">完成率</div>
                  <div className="text-2xl font-bold text-slate-800">{completionRate}%</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-1">待主管審核</div>
                  <div className="text-2xl font-bold text-slate-800">{stats.pendingReview}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-500 mb-1">已核定</div>
                  <div className="text-2xl font-bold text-slate-800">{stats.reviewed}</div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="flex-1 relative">
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input 
                type="text" 
                placeholder={activeTab === 'overview' ? "搜尋員工、部門、評核名稱..." : "搜尋姓名 / 部門..."}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-violet-500 text-sm outline-none transition-shadow"
              />
            </div>
            <button className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl border border-slate-200 transition-colors flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              {activeTab === 'talent' ? '篩選' : '進階篩選'}
            </button>
          </div>

          {/* Main Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-medium">
                {activeTab === 'overview' && (
                  <tr>
                    <th className="px-6 py-4">受評人</th>
                    <th className="px-6 py-4">評核狀態</th>
                    <th className="px-6 py-4">初評分數</th>
                    <th className="px-6 py-4">最終判定等級</th>
                    <th className="px-6 py-4 text-center">操作</th>
                  </tr>
                )}
                {activeTab === 'team' && (
                  <tr>
                    <th className="px-6 py-4">員工編號 / 姓名</th>
                    <th className="px-6 py-4">部門 / 職稱</th>
                    <th className="px-6 py-4">帳號權限</th>
                    <th className="px-6 py-4">狀態</th>
                    <th className="px-6 py-4 text-right">操作</th>
                  </tr>
                )}
                {activeTab === 'talent' && (
                  <tr>
                    <th className="px-6 py-4">員工姓名</th>
                    <th className="px-6 py-4">部門</th>
                    <th className="px-6 py-4">等級</th>
                    <th className="px-6 py-4">綜合分數</th>
                    <th className="px-6 py-4">人才型態</th>
                    <th className="px-6 py-4 text-center">操作</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeam.map((t, idx) => {
                  const hasRecord = !!t.record;
                  const isReviewed = t.record?.status === 'Reviewed';
                  const grade = t.record?.supervisorReview?.finalGrade || '-';
                  const score = t.record?.computed?.comprehensiveScore || '-';
                  const talentType = t.record?.computed?.talentType || '未定義';

                  if (activeTab === 'overview') {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{t.user.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{t.user.department}</div>
                        </td>
                        <td className="px-6 py-4">
                          {isReviewed ? <span className="text-slate-600 font-medium">已核定</span> : 
                           hasRecord ? <span className="text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded-md">待主管審核</span> : 
                           <span className="text-slate-400">未送出</span>}
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{score}</td>
                        <td className="px-6 py-4">
                          {isReviewed ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              grade === 'A' ? 'bg-purple-100 text-purple-700' :
                              grade === 'B' ? 'bg-blue-100 text-blue-700' :
                              grade === 'C' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                            }`}>{grade} 級</span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button 
                            disabled={!hasRecord}
                            onClick={() => hasRecord && openReview(t.record!)}
                            className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            查看明細
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'team') {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{t.user.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{t.user.email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {t.user.department} <br/> <span className="text-xs text-slate-400">{t.user.title}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] rounded-full font-medium">employee</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600 text-sm">啟用中</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 text-slate-400">
                            {hasRecord && (
                              <button onClick={() => openReview(t.record!)} className="p-1.5 hover:text-violet-600 hover:bg-violet-50 rounded-md transition-colors" title="修改員工提報資料">✏️</button>
                            )}
                            <button className="p-1.5 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="檢視">👀</button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (activeTab === 'talent') {
                    if (!isReviewed) return null; // 只顯示已核定人才
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{t.user.name}</td>
                        <td className="px-6 py-4 text-slate-600">{t.user.department}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                              grade === 'A' ? 'bg-purple-50 border-purple-200 text-purple-700' :
                              grade === 'B' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                              grade === 'C' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>{grade} 級</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-violet-600">{score}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{talentType}</td>
                        <td className="px-6 py-4 text-center">
                          <button onClick={() => openReview(t.record!)} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                            查看分析
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  
                  return null;
                })}

                {filteredTeam.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      找不到符合條件的資料
                    </td>
                  </tr>
                )}
                {activeTab === 'talent' && filteredTeam.filter(t => t.record?.status === 'Reviewed').length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      目前尚未有已核定的員工資料
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
