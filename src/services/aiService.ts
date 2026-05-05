import { GoogleGenerativeAI } from "@google/generative-ai";
import { apiKeyManager } from "../utils/apiKeyManager";

export const aiService = {
  /**
   * 執行 AI 生成，若遇到 429 或 503 錯誤會自動切換 Key 並重試
   */
  async generateContent(prompt: string, modelName: string = "gemini-1.5-flash") {
    const maxAttempts = apiKeyManager.getTotalKeys();
    let lastError = null;

    for (let i = 0; i < maxAttempts; i++) {
      const apiKey = apiKeyManager.getCurrentKey();
      if (!apiKey) {
        throw new Error("找不到有效的 API Key");
      }

      try {
        console.log(`[AI Service] 使用第 ${apiKeyManager.getCurrentIndex() + 1} 把金鑰進行生成...`);
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
        
      } catch (error: any) {
        lastError = error;
        // 429: Too Many Requests, 503: Service Unavailable
        if (error.message?.includes("429") || error.message?.includes("503") || error.message?.includes("quota")) {
          console.warn(`[AI Service] 金鑰 #${apiKeyManager.getCurrentIndex() + 1} 失敗 (配額限制或服務不可用)。正在切換...`);
          apiKeyManager.rotateKey();
          // 稍微等待一下再重試
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          // 其他不可修復的錯誤（如無效 API Key 等）
          console.error("[AI Service] 發生非配額相關錯誤:", error.message);
          throw error;
        }
      }
    }

    console.error("[AI Service] 所有可用的 API Keys 皆已嘗試但失敗。");
    throw lastError || new Error("無法完成 AI 生成請求。");
  }
};
