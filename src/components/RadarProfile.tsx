import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { AssessmentComputed } from '../types';

export default function RadarProfile({ computed }: { computed: AssessmentComputed }) {
  const data = [
    { subject: '內容應用', A: computed.domainContent, fullMark: 10 },
    { subject: '流程優化', A: computed.domainEfficiency, fullMark: 10 },
    { subject: '數據分析', A: computed.domainAnalysis, fullMark: 10 },
    { subject: '策略/設計', A: computed.domainInnovation, fullMark: 10 },
    { subject: '機器人建置', A: computed.domainIntegration, fullMark: 10 },
  ];

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
          <Radar name="能力指標" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
