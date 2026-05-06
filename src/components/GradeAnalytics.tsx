import React, { useState } from 'react';
import { User, AssessmentRecord } from '../types';

interface GradeAnalyticsProps {
  users: User[];
  records: AssessmentRecord[];
  title?: string; // e.g. "全公司" or "我的團隊"
}

const GRADE_CONFIG: Record<string, { label: string; color: string; bg: string; bar: string }> = {
  A: { label: 'A 級', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200', bar: 'bg-purple-500' },
  B: { label: 'B 級', color: 'text-blue-700',   bg: 'bg-blue-100 border-blue-200',   bar: 'bg-blue-500'   },
  C: { label: 'C 級', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', bar: 'bg-emerald-500' },
  D: { label: 'D 級', color: 'text-orange-600',  bg: 'bg-orange-100 border-orange-200',  bar: 'bg-orange-400' },
  E: { label: 'E 級', color: 'text-red-600',     bg: 'bg-red-100 border-red-200',     bar: 'bg-red-400'    },
};

export default function GradeAnalytics({ users, records, title = '全體' }: GradeAnalyticsProps) {
  const [viewMode, setViewMode] = useState<'grade' | 'talent' | 'dept'>('grade');

  const reviewedRecords = records.filter(r => r.status === 'Reviewed' && r.supervisorReview);

  // --- Grade Distribution ---
  const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  reviewedRecords.forEach(r => {
    const g = r.supervisorReview!.finalGrade;
    if (gradeCounts[g] !== undefined) gradeCounts[g]++;
  });
  const totalReviewed = reviewedRecords.length;
  const maxGradeCount = Math.max(...Object.values(gradeCounts), 1);

  // --- Talent Type Distribution ---
  const talentCounts: Record<string, number> = {};
  reviewedRecords.forEach(r => {
    const t = r.computed?.talentType || '未定義';
    talentCounts[t] = (talentCounts[t] || 0) + 1;
  });
  const talentEntries = Object.entries(talentCounts).sort((a, b) => b[1] - a[1]);
  const maxTalentCount = Math.max(...talentEntries.map(e => e[1]), 1);

  // --- Department Distribution ---
  interface DeptStats {
    total: number;
    reviewed: number;
    grades: Record<string, number>;
  }
  const deptMap: Record<string, DeptStats> = {};
  users.forEach(u => {
    if (!deptMap[u.department]) deptMap[u.department] = { total: 0, reviewed: 0, grades: { A: 0, B: 0, C: 0, D: 0, E: 0 } };
    deptMap[u.department].total++;
    const rec = reviewedRecords.find(r => r.userEmail === u.email);
    if (rec) {
      deptMap[u.department].reviewed++;
      const g = rec.supervisorReview!.finalGrade;
      deptMap[u.department].grades[g]++;
    }
  });
  const deptEntries = Object.entries(deptMap).sort((a, b) => b[1].total - a[1].total);

  const totalFilled = records.filter(r => r.status === 'Submitted' || r.status === 'Reviewed').length;
  const completionRate = users.length > 0 ? Math.round((totalFilled / users.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">總人數</div>
          <div className="text-3xl font-black text-slate-800">{users.length}</div>
          <div className="text-xs text-slate-400 mt-1">{title}員工</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">填寫完成率</div>
          <div className="text-3xl font-black text-violet-600">{completionRate}%</div>
          <div className="text-xs text-slate-400 mt-1">{totalFilled} / {users.length} 人</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">已核定人數</div>
          <div className="text-3xl font-black text-emerald-600">{totalReviewed}</div>
          <div className="text-xs text-slate-400 mt-1">等級已確定</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">待審核</div>
          <div className="text-3xl font-black text-orange-500">{records.filter(r => r.status === 'Submitted').length}</div>
          <div className="text-xs text-slate-400 mt-1">等待主管覆核</div>
        </div>
      </div>

      {/* Grade Distribution Cards */}
      <div className="grid grid-cols-5 gap-3">
        {(['A', 'B', 'C', 'D', 'E'] as const).map(g => {
          const cfg = GRADE_CONFIG[g];
          const count = gradeCounts[g];
          const pct = totalReviewed > 0 ? Math.round((count / totalReviewed) * 100) : 0;
          return (
            <div key={g} className={`bg-white rounded-2xl p-5 border shadow-sm text-center flex flex-col items-center gap-2 ${cfg.bg}`}>
              <div className={`text-3xl font-black ${cfg.color}`}>{g}</div>
              <div className={`text-4xl font-black text-slate-800`}>{count}</div>
              <div className="text-xs font-medium text-slate-500">人</div>
              <div className={`text-sm font-bold ${cfg.color}`}>{pct}%</div>
              {/* Mini bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1">
                <div className={`h-full rounded-full ${cfg.bar} transition-all duration-700`} style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab Switch */}
      <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm w-fit">
        {([['grade', '📊 等級長條圖'], ['talent', '🎯 人才型態分布'], ['dept', '🏢 部門分析']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setViewMode(key)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === key ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Grade Bar Chart */}
      {viewMode === 'grade' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-6">ABCDE 等級分布長條圖</h3>
          {totalReviewed === 0 ? (
            <div className="py-12 text-center text-slate-400">目前尚無已核定的評核資料</div>
          ) : (
            <div className="space-y-5">
              {(['A', 'B', 'C', 'D', 'E'] as const).map(g => {
                const cfg = GRADE_CONFIG[g];
                const count = gradeCounts[g];
                const widthPct = (count / maxGradeCount) * 100;
                const pct = totalReviewed > 0 ? Math.round((count / totalReviewed) * 100) : 0;
                return (
                  <div key={g} className="flex items-center gap-4">
                    <div className={`w-10 text-center font-black text-lg ${cfg.color}`}>{g}</div>
                    <div className="flex-1 h-10 bg-slate-100 rounded-xl overflow-hidden relative">
                      <div
                        className={`h-full ${cfg.bar} rounded-xl flex items-center px-4 transition-all duration-700 ease-out`}
                        style={{ width: `${widthPct}%`, minWidth: count > 0 ? '48px' : '0' }}
                      >
                        {count > 0 && <span className="text-white font-bold text-sm">{count} 人</span>}
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className={`text-sm font-bold ${cfg.color}`}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Talent Type Bar Chart */}
      {viewMode === 'talent' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-6">人才型態分布長條圖</h3>
          {talentEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400">目前尚無已核定的評核資料</div>
          ) : (
            <div className="space-y-4">
              {talentEntries.map(([talent, count], idx) => {
                const widthPct = (count / maxTalentCount) * 100;
                const pct = totalReviewed > 0 ? Math.round((count / totalReviewed) * 100) : 0;
                const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-400', 'bg-fuchsia-500', 'bg-teal-500'];
                const barColor = colors[idx % colors.length];
                return (
                  <div key={talent} className="flex items-center gap-4">
                    <div className="w-28 text-xs font-semibold text-slate-600 text-right truncate" title={talent}>{talent}</div>
                    <div className="flex-1 h-9 bg-slate-100 rounded-xl overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-xl flex items-center px-3 transition-all duration-700 ease-out`}
                        style={{ width: `${widthPct}%`, minWidth: count > 0 ? '48px' : '0' }}
                      >
                        {count > 0 && <span className="text-white font-bold text-sm">{count} 人</span>}
                      </div>
                    </div>
                    <div className="w-16 text-right">
                      <span className="text-sm font-bold text-slate-500">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Department Breakdown */}
      {viewMode === 'dept' && (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-6">各部門 ABCDE 等級統計</h3>
          {deptEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400">尚未導入員工資料</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 pr-6">部門</th>
                    <th className="pb-3 text-center px-3">總人數</th>
                    <th className="pb-3 text-center px-3">核定率</th>
                    {(['A', 'B', 'C', 'D', 'E'] as const).map(g => (
                      <th key={g} className={`pb-3 text-center px-3 ${GRADE_CONFIG[g].color}`}>{g} 級</th>
                    ))}
                    <th className="pb-3 pl-4">分布視覺化</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deptEntries.map(([dept, stats]) => {
                    const reviewRate = stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0;
                    return (
                      <tr key={dept} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 pr-6 font-semibold text-slate-800">{dept}</td>
                        <td className="py-4 text-center px-3 text-slate-600">{stats.total}</td>
                        <td className="py-4 text-center px-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${reviewRate === 100 ? 'bg-emerald-100 text-emerald-700' : reviewRate > 50 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {reviewRate}%
                          </span>
                        </td>
                        {(['A', 'B', 'C', 'D', 'E'] as const).map(g => (
                          <td key={g} className={`py-4 text-center px-3 font-bold ${stats.grades[g] > 0 ? GRADE_CONFIG[g].color : 'text-slate-300'}`}>
                            {stats.grades[g] > 0 ? stats.grades[g] : '-'}
                          </td>
                        ))}
                        <td className="py-4 pl-4">
                          {stats.reviewed > 0 ? (
                            <div className="flex h-6 gap-0.5 rounded-full overflow-hidden w-32">
                              {(['A', 'B', 'C', 'D', 'E'] as const).map(g => {
                                const w = Math.round((stats.grades[g] / stats.reviewed) * 100);
                                return w > 0 ? (
                                  <div key={g} title={`${g}: ${stats.grades[g]}人`} className={`${GRADE_CONFIG[g].bar} transition-all`} style={{ width: `${w}%` }}></div>
                                ) : null;
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">尚無核定</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
