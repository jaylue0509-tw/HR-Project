import React from 'react';
import { AssessmentRecord, User } from '../types';
import RadarProfile from './RadarProfile';

interface Props {
  record: AssessmentRecord;
  user: User;
}

export default function TalentProfile({ record, user }: Props) {
  const { computed, supervisorReview } = record;
  if (!computed) return null;

  const getTalentGradeDesc = (grade: string) => {
    switch (grade) {
      case 'A': return '卓越領航者';
      case 'B': return '高效實戰者';
      case 'C': return '穩健應用者';
      case 'D': return '潛力探索者';
      default: return '入門學習者';
    }
  };

  return (
    <div className="bg-slate-50/50 p-8 rounded-[32px] border border-slate-200 shadow-sm max-w-4xl mx-auto my-8 font-sans">
      <div className="text-center mb-10">
        <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">
          成效合成：AI 員工數位名片 <span className="text-slate-400 font-medium">(Talent Profile)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Side: Profile & Scores */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
              <svg className="w-16 h-16 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div>
              <div className="text-xl font-bold text-slate-800">姓名：{user.name}</div>
              <div className="text-lg text-slate-600 mt-1">
                綜合評級：<span className="font-bold text-blue-600">{supervisorReview?.finalGrade || 'C'} 級</span> 
                <span className="text-sm text-slate-500 ml-1">({getTalentGradeDesc(supervisorReview?.finalGrade || 'C')})</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {computed.coreStrengths.split(',').map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold border border-slate-200">
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Core Stats */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
               核心數據：
            </h3>
            <div className="flex items-center space-x-6">
              <div className="flex items-baseline space-x-1">
                <span className="text-slate-500 text-sm">⚙ 綜合成熟度</span>
                <span className="text-3xl font-black text-slate-800">{computed.comprehensiveScore}</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="flex items-baseline space-x-1">
                <span className="text-slate-500 text-sm">↗ 核心強項：{computed.talentType}</span>
                <span className="text-2xl font-bold text-blue-600">{computed.depth}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Radar Chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <div className="h-full min-h-[300px]">
            <RadarProfile computed={computed} />
          </div>
        </div>

      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-2">已驗證成果：</h3>
          <p className="text-slate-600 leading-relaxed">
            {record.data?.evidenceDesc || '無具體描述'}
          </p>
          {record.data?.botNames && (
             <div className="mt-3 pt-3 border-t border-slate-50 text-sm text-slate-500">
                建置機器人：{record.data.botNames} ({record.data.botCount} 項)
             </div>
          )}
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 bg-blue-50/30">
          <h3 className="text-lg font-bold text-slate-800 mb-2">發展建議：</h3>
          <p className="text-slate-600 leading-relaxed">
            {supervisorReview?.comments || '繼續保持 AI 應用的熱情，探索更多自動化流程的可能性。'}
          </p>
        </div>
      </div>
    </div>
  );
}
