import { AssessmentData, AssessmentComputed } from '../types';

const API_KEYS = [
  'AIzaSyDBAzAxGvM2vzHW0cDNN-8XbFKUXsr9R4Q',
  'AIzaSyC-j2GDceRvzbqHf-CnY_GFYuqQ0uqzPDY'
];

let currentKeyIndex = 0;

export const aiService = {
  /**
   * 呼叫 Gemini API 生成主管評語建議
   * 具備自動切換 API Key 機制（當 Key A 額度用盡或報錯時，自動切換至 Key B）
   */
  generateReviewSuggestion: async (data: AssessmentData, computed: AssessmentComputed): Promise<string> => {
    const prompt = `
      您是一位資深 HR 與管理顧問。請針對以下員工的 AI 職能自評資料，提供一段專業、具建設性且溫暖的主管評語建議。
      
      【員工自評數據】
      - 常用工具: ${data.tools}
      - 使用頻率: ${data.frequency}
      - 機器人數量: ${data.botCount}
      - 綜合分數 (0-10): ${computed.comprehensiveScore}
      - 人才型態: ${computed.talentType}
      - 核心強項: ${computed.coreStrengths}
      - 量化成效說明: ${data.evidenceDesc}
      
      【評語要求】
      1. 肯定其在 AI 應用上的具體努力。
      2. 針對其人才型態給予職涯發展建議。
      3. 語氣專業、客觀但帶有鼓勵。
      4. 字數約 100-200 字。
      請直接回傳評語內容即可。
    `;

    return aiService.callGeminiWithRetry(prompt);
  },

  callGeminiWithRetry: async (prompt: string, retryCount = 0): Promise<string> => {
    if (retryCount >= API_KEYS.length) {
      throw new Error('所有 API Key 額度皆已用盡或發生錯誤。');
    }

    const apiKey = API_KEYS[currentKeyIndex];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.status === 429 || response.status === 403) {
        // 額度用盡或被拒絕，切換下一個 Key
        console.warn(`API Key ${currentKeyIndex + 1} 額度可能已達上限，正在切換...`);
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        return aiService.callGeminiWithRetry(prompt, retryCount + 1);
      }

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('AI 呼叫失敗:', error);
      // 其他錯誤也嘗試切換 Key
      currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
      return aiService.callGeminiWithRetry(prompt, retryCount + 1);
    }
  }
};
