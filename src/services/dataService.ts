import { User, AssessmentRecord, AssessmentData, AssessmentComputed, SupervisorReview, AssessmentScores } from './types';

const USERS_KEY = 'hr_ai_users';
const ASSESSMENTS_KEY = 'hr_ai_assessments';

export const dataService = {
  initFromBackend: async () => {
    try {
      const [uRes, aRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/assessments')
      ]);
      if (uRes.ok) {
        const users = await uRes.json();
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
      if (aRes.ok) {
        const assessments = await aRes.json();
        localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments));
      }
    } catch (e) {
      console.error('Failed to init from backend', e);
    }
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setUsers: (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    // Sync to backend
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users)
    }).catch(e => console.error('Failed to sync users to backend', e));
  },

  getUserByEmail(email: string): User | undefined {
    const raw = localStorage.getItem(USERS_KEY);
    const users: User[] = raw ? JSON.parse(raw) : [];
    return users.find(u => u.email === email);
  },

  getAssessments: (): AssessmentRecord[] => {
    const data = localStorage.getItem(ASSESSMENTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveAssessment: (record: AssessmentRecord) => {
    const raw = localStorage.getItem(ASSESSMENTS_KEY);
    const assessments: AssessmentRecord[] = raw ? JSON.parse(raw) : [];
    const index = assessments.findIndex(a => a.userEmail === record.userEmail);
    if (index >= 0) {
      assessments[index] = record;
    } else {
      assessments.push(record);
    }
    localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments));
    // Sync to backend
    fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }).catch(e => console.error('Failed to sync assessment to backend', e));
  },

  getAssessmentByEmail(email: string): AssessmentRecord | undefined {
    const raw = localStorage.getItem(ASSESSMENTS_KEY);
    const assessments: AssessmentRecord[] = raw ? JSON.parse(raw) : [];
    return assessments.find(a => a.userEmail === email);
  },

  // Compute logic
  computeAssessment(scores: AssessmentScores): AssessmentComputed {
    const domainContent = ((scores.textGeneration + scores.contentOrganization) / 2) * 2;
    const domainEfficiency = ((scores.workEfficiency + scores.processOptimization) / 2) * 2;
    const domainAnalysis = ((scores.analysis + scores.decisionSupport) / 2) * 2;
    const domainInnovation = ((scores.ideaGeneration + scores.professionalApplication) / 2) * 2;
    const domainIntegration = ((scores.structureDesign + scores.botConstruction) / 2) * 2;

    const domains = [
      { name: '內容應用型', score: domainContent },
      { name: '流程優化型', score: domainEfficiency },
      { name: '數據分析型', score: domainAnalysis },
      { name: '策略推進/設計生成型', score: domainInnovation },
      { name: '機器人建置型', score: domainIntegration },
    ];

    const breadth = domains.reduce((sum, d) => sum + d.score, 0) / 5;
    
    // Depth: highest 2 domains average
    const sortedDomains = [...domains].sort((a, b) => b.score - a.score);
    const depth = (sortedDomains[0].score + sortedDomains[1].score) / 2;

    const comprehensiveScore = (breadth * 0.6) + (depth * 0.4);

    const coreStrengths = `${sortedDomains[0].name}, ${sortedDomains[1].name}`;
    const talentType = sortedDomains[0].name;

    return {
      domainContent,
      domainEfficiency,
      domainAnalysis,
      domainInnovation,
      domainIntegration,
      breadth: Number(breadth.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      comprehensiveScore: Number(comprehensiveScore.toFixed(2)),
      coreStrengths,
      talentType
    };
  },

  calculateFinalGrade(computed: AssessmentComputed, review: Partial<SupervisorReview>): 'A' | 'B' | 'C' | 'D' | 'E' {
    const { comprehensiveScore, depth } = computed;
    const validEvidence = review.evidenceStatus === 'Approved';
    
    // Logic from specifications:
    // A: 綜合 >= 8.0, 核心 >= 8.5
    // B: 綜合 >= 6.5, 核心 >= 8.0
    // C: 綜合 >= 4.5, 核心 >= 7.0
    // D: 綜合 >= 2.5
    // E: 綜合 < 2.5
    // Rule: A/B needs valid evidence. Otherwise max C.

    if (comprehensiveScore >= 8.0 && depth >= 8.5) {
      return validEvidence ? 'A' : 'C';
    }
    if (comprehensiveScore >= 6.5 && depth >= 8.0) {
      return validEvidence ? 'B' : 'C';
    }
    if (comprehensiveScore >= 4.5 && depth >= 7.0) {
      return 'C';
    }
    if (comprehensiveScore >= 2.5) {
      return 'D';
    }
    return 'E';
  }
};
