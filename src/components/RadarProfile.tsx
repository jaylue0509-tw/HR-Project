import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { AssessmentComputed } from '../types';

export default function RadarProfile({ computed }: { computed: AssessmentComputed }) {
  // Ordered as per image (Top, Right, Bottom-Right, Bottom-Left, Left)
  const data = [
    { subject: '策略推進', A: computed.domainInnovation, fullMark: 10 },
    { subject: '知識整合', A: computed.domainIntegration, fullMark: 10 },
    { subject: '流程優化', A: computed.domainEfficiency, fullMark: 10 },
    { subject: '數據分析', A: computed.domainAnalysis, fullMark: 10 },
    { subject: '內容應用', A: computed.domainContent, fullMark: 10 },
  ];

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#1e293b', fontSize: 13, fontWeight: 600 }} />
          <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} axisLine={false} />
          <Radar 
            name="能力指標" 
            dataKey="A" 
            stroke="#0ea5e9" 
            fill="#0ea5e9" 
            fillOpacity={0.4} 
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
