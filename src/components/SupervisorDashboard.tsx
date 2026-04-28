import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { User, AssessmentRecord, SupervisorReview } from '../types';
import RadarProfile from './RadarProfile';

export default function SupervisorDashboard() {
  const { currentUser, logout, users } = useAuth();
  const [teamRecords, setTeamRecords] = useState<{ user: User, record?: AssessmentRecord }[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);

  // Form states for review
  const [impactScore, setImpactScore] = useState(3);
  const [evidenceStatus, setEvidenceStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'None'>('None');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadTeam();
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hr_ai_assessments' || e.key === 'hr_ai_users') {
        if (currentUser) loadTeam();
      }
    };
    
    // Also listen to custom event for same-tab updates if needed
    const handleCustomChange = () => {
       if (currentUser) loadTeam();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('hr_data_changed', handleCustomChange);
    
    // Initial load interval as a fallback for strict real-time feel
    const interval = setInterval(() => {
       if (currentUser) loadTeam();
    }, 2000);

    return () => {
       window.removeEventListener('storage', handleStorageChange);
       window.removeEventListener('hr_data_changed', handleCustomChange);
       clearInterval(interval);
    };
  }, [currentUser, users]);

  const loadTeam = () => {
    const team = users.filter(u => u.supervisorEmail === currentUser?.email);
    const assessments = dataService.getAssessments();
    
    const combined = team.map(u => ({
      user: u,
      record: assessments.find(a => a.userEmail === u.email)
    })).filter(t => t.record); // Only keep members who have submitted
    
    setTeamRecords(combined);
  };

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
      finalGrade: 'E' // Placeholder
    };

    review.finalGrade = dataService.calculateFinalGrade(selectedRecord.computed, review);

    const updatedRecord: AssessmentRecord = {
      ...selectedRecord,
      status: 'Reviewed',
      supervisorReview: review
    };

    dataService.saveAssessment(updatedRecord);
    setSelectedRecord(null);
    loadTeam(); // refresh view
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">主管覆核儀表板</h2>
          <p className="text-sm text-slate-500 mt-1">哈囉, {currentUser?.name} (您團隊共有 {teamRecords.length} 人)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Team List */}
        <div className="lg:col-span-1 bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-0 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 bg-white/30 backdrop-blur-md border-b border-white/40">
             <h3 className="font-semibold text-slate-800">團隊成員列表</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-white/20 backdrop-blur-sm">
            {teamRecords.map((t, idx) => {
              const statusColor = !t.record ? 'bg-slate-100 text-slate-500' 
                                : t.record.status === 'Reviewed' ? 'bg-green-100 text-green-700' 
                                : 'bg-blue-100 text-blue-700';
              const statusText = !t.record ? '未填寫' : t.record.status === 'Reviewed' ? `已覆核 (${t.record.supervisorReview?.finalGrade} 級)` : '待覆核';

              return (
                <button 
                  key={idx} 
                  onClick={() => t.record && openReview(t.record)}
                  disabled={!t.record}
                  className={`w-full text-left p-3 rounded-xl border transition-all backdrop-blur-sm ${
                    selectedRecord?.userEmail === t.user.email 
                      ? 'bg-blue-100/50 border-blue-300 ring-1 ring-blue-400 shadow-sm' 
                      : 'bg-white/40 border-white/50 hover:bg-white/60 hover:shadow-sm'
                  } ${!t.record ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{t.user.name}</div>
                      <div className="text-xs text-slate-500">{t.user.title}</div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                </button>
              );
            })}
            {teamRecords.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">
                目前沒有任何下屬送出評核
              </div>
            )}
          </div>
        </div>

        {/* Right: Review detail */}
        <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-6 flex flex-col h-[700px] overflow-y-auto">
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
                      <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 text-sm border border-white/60 h-64 overflow-y-auto space-y-3">
                         <div>
                           <div className="text-xs text-slate-500 font-medium">量化成效</div>
                           <p className="mt-1 text-slate-800">{selectedRecord.data.evidenceDesc || '未提報'}</p>
                         </div>
                         <div>
                           <div className="text-xs text-slate-500 font-medium">連結/附件</div>
                           {selectedRecord.data.evidenceLink ? (
                             <a href={selectedRecord.data.evidenceLink} target="_blank" rel="noopener noreferrer" className="mt-1 text-blue-600 hover:underline block break-all">
                               {selectedRecord.data.evidenceLink}
                             </a>
                           ) : <span className="mt-1 text-slate-800 block">未提供</span>}
                         </div>
                         <div>
                           <div className="text-xs text-slate-500 font-medium">常用工具</div>
                           <p className="mt-1 text-slate-800">{selectedRecord.data.tools} ({selectedRecord.data.frequency})</p>
                         </div>
                      </div>
                    </div>
                 </div>
              </div>

              {/* Review Form */}
              <div className="bg-blue-100/40 backdrop-blur-sm rounded-2xl p-5 border border-blue-200/50 shadow-sm mt-4">
                 <h4 className="font-semibold text-slate-800 mb-4 border-l-4 border-blue-600 pl-2">主管評分與判定</h4>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        1. 成果成熟度 (Impact) <span className="font-normal text-slate-500">- 從會用到跨部門可複製</span>
                      </label>
                      <select value={impactScore} onChange={e => setImpactScore(Number(e.target.value))} className="w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all">
                         <option value={1}>1 - 幾近無產出</option>
                         <option value={2}>2 - 初步嘗試，產出不穩定</option>
                         <option value={3}>3 - 能獨力量產，品質中等</option>
                         <option value={4}>4 - 品質優良，已優化部門流程</option>
                         <option value={5}>5 - 跨部門典範，具制度推廣價值</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        2. 證據狀態審核 <span className="font-normal text-slate-500">- 升遷 A/B 級必備</span>
                      </label>
                      <select value={evidenceStatus} onChange={e => setEvidenceStatus(e.target.value as any)} className="w-full rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-2.5 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all">
                         <option value="None">未提供 / 無法認定</option>
                         <option value="Pending">已提供，待確認</option>
                         <option value="Rejected">已審核：不符合標準</option>
                         <option value="Approved">已審核：認可為有效證據</option>
                      </select>
                    </div>
                 </div>

                 <div className="mb-4">
                   <label className="block text-sm font-medium text-slate-700 mb-1">主管評語 (選填)</label>
                   <textarea value={comments} onChange={e => setComments(e.target.value)} className="w-full h-16 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 px-4 py-3 text-sm focus:bg-white/70 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 transition-all placeholder:text-slate-400" placeholder="給予員工後續發展建議..."></textarea>
                 </div>

                 <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-xl border border-white/60 shadow-sm">
                    <div className="text-sm">
                      動態試算結果：
                      <span className="ml-2 font-bold text-lg text-slate-900">
                         {dataService.calculateFinalGrade(selectedRecord.computed, { evidenceStatus, impactScore })} 級
                      </span>
                    </div>
                    <button onClick={submitReview} className="bg-slate-800/90 backdrop-blur-md text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-900 shadow-md border border-slate-700/50 transition-all text-sm">
                       完成覆核並送出
                    </button>
                 </div>
              </div>


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
