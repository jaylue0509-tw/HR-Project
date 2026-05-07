import { User, AssessmentRecord, AssessmentData, AssessmentComputed, SupervisorReview, AssessmentScores } from '../types';

import { db } from './firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

const USERS_KEY = 'hr_ai_users';
const ASSESSMENTS_KEY = 'hr_ai_assessments';

// 備份用 Google Sheets 網址
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzfXIXygziACBZpimcnJDgctcwmGeuhKCkWsUNy1CBSSbFqbHjq2ASfhs7rtvFIXVRX/exec';

export const dataService = {
  initFromBackend: async () => {
    // 棄用，改由 AuthContext 使用 onSnapshot 處理
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  setUsers: async (users: User[]) => {
    // 先寫 localStorage，確保即使 Firebase 失敗也能用
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Firebase 寫入：切分成最多 499 筆一批（Firebase batch 上限 500）
    try {
      const CHUNK_SIZE = 499;
      for (let i = 0; i < users.length; i += CHUNK_SIZE) {
        const chunk = users.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(user => {
          const userRef = doc(db, 'users', user.email);
          batch.set(userRef, user);
        });
        await batch.commit();
      }

      // 背景雙重備份至 Google Sheets (不阻擋主流程)
      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'syncUsers', data: users })
      }).catch(e => console.warn('Backup to GAS failed', e));

    } catch (e) {
      // Firebase 失敗只是記錄 warning，不將錯誤向上拋出（不打斷使用者操作）
      console.warn('Firebase sync failed for users (data saved locally):', e);
    }
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

  saveAssessment: async (record: AssessmentRecord) => {
    // 先寫 localStorage
    const raw = localStorage.getItem(ASSESSMENTS_KEY);
    const assessments: AssessmentRecord[] = raw ? JSON.parse(raw) : [];
    const index = assessments.findIndex(a => a.userEmail === record.userEmail);
    if (index >= 0) {
      assessments[index] = record;
    } else {
      assessments.push(record);
    }
    localStorage.setItem(ASSESSMENTS_KEY, JSON.stringify(assessments));
    window.dispatchEvent(new Event('hr_data_changed'));
    
    // Firebase 寫入：失敗只是記錄 warning，不閘塞主流程
    try {
      const docRef = doc(db, 'assessments', record.userEmail);
      await setDoc(docRef, record);

      // 背景雙重備份至 Google Sheets
      fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'syncAssessment', data: record })
      }).catch(e => console.warn('Backup to GAS failed', e));

    } catch (e) {
      console.warn('Firebase sync failed for assessment (data saved locally):', e);
      // 不再 throw，讓呼叫端認為成功，因為本地已儲存
    }
  },

  getAssessmentByEmail(email: string): AssessmentRecord | undefined {
    const raw = localStorage.getItem(ASSESSMENTS_KEY);
    const assessments: AssessmentRecord[] = raw ? JSON.parse(raw) : [];
    return assessments.find(a => a.userEmail === email);
  },

  // Compute logic
  computeAssessment(scores: AssessmentScores): AssessmentComputed {
    // 1. Five domain scores (5-pt scale)
    const dContent = (scores.textGeneration + scores.contentOrganization) / 2;
    const dEfficiency = (scores.workEfficiency + scores.processOptimization) / 2;
    const dAnalysis = (scores.analysis + scores.decisionSupport) / 2;
    const dInnovation = (scores.ideaGeneration + scores.professionalApplication) / 2;
    const dIntegration = (scores.structureDesign + scores.botConstruction) / 2;

    const domains = [
      { name: '內容應用型', score: dContent },
      { name: '流程優化型', score: dEfficiency },
      { name: '數據分析型', score: dAnalysis },
      { name: '策略推進/設計生成型', score: dInnovation },
      { name: '機器人建置型', score: dIntegration },
    ];

    // 2. Average of 10 indicators (5-pt scale)
    const indicators = Object.values(scores);
    const average5 = indicators.reduce((sum, s) => sum + s, 0) / indicators.length;
    
    // 3. Depth: highest 2 domains average (5-pt scale)
    const sortedDomains = [...domains].sort((a, b) => b.score - a.score);
    const depth5 = (sortedDomains[0].score + sortedDomains[1].score) / 2;

    // 4. Formula: (Average * 0.6) + (Depth * 0.4)
    const comprehensive5 = (average5 * 0.6) + (depth5 * 0.4);

    // 5. Convert to 10-pt scale
    const domainContent = dContent * 2;
    const domainEfficiency = dEfficiency * 2;
    const domainAnalysis = dAnalysis * 2;
    const domainInnovation = dInnovation * 2;
    const domainIntegration = dIntegration * 2;
    const breadth = average5 * 2;
    const depth = depth5 * 2;
    const comprehensiveScore = comprehensive5 * 2;

    const coreStrengths = `${sortedDomains[0].name}, ${sortedDomains[1].name}`;
    const talentType = sortedDomains[0].name;

    return {
      domainContent: Number(domainContent.toFixed(2)),
      domainEfficiency: Number(domainEfficiency.toFixed(2)),
      domainAnalysis: Number(domainAnalysis.toFixed(2)),
      domainInnovation: Number(domainInnovation.toFixed(2)),
      domainIntegration: Number(domainIntegration.toFixed(2)),
      breadth: Number(breadth.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      comprehensiveScore: Number(comprehensiveScore.toFixed(2)),
      coreStrengths,
      talentType
    };
  },

  calculateFinalGrade(computed: AssessmentComputed, review: Partial<SupervisorReview>): 'A' | 'B' | 'C' | 'D' | 'E' {
    const { comprehensiveScore } = computed;
    const hasEvidence = review.evidenceStatus === 'Approved';
    
    // impactScore (1-5) from supervisor adjusts the effective depth.
    // Default to 3 if not set. Maps: 1→0.6, 2→0.8, 3→1.0, 4→1.15, 5→1.3
    const impact = review.impactScore ?? 3;
    const impactMultiplier = 0.6 + (impact - 1) * (0.7 / 4); // linear: 1→0.6 ... 5→1.3
    const adjustedDepth = computed.depth * impactMultiplier;

    // A: comprehensive >= 8.0, adjustedDepth >= 8.5, needs evidence
    if (comprehensiveScore >= 8.0 && adjustedDepth >= 8.5) {
      return hasEvidence ? 'A' : 'C';
    }
    
    // B: comprehensive >= 6.5, adjustedDepth >= 8.0, needs evidence  
    if (comprehensiveScore >= 6.5 && adjustedDepth >= 8.0) {
      return hasEvidence ? 'B' : 'C';
    }
    
    // C: comprehensive >= 4.5
    if (comprehensiveScore >= 4.5) {
      if (comprehensiveScore >= 6.5 || adjustedDepth >= 7.0) return 'C';
      return 'D';
    }
    
    // D: comprehensive >= 2.5
    if (comprehensiveScore >= 2.5) return 'D';
    
    // E: < 2.5
    return 'E';
  }
};
