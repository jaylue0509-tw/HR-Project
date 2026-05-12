
export class ApiKeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;
  private listeners: ((index: number) => void)[] = [];

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // 優先讀取 .env 中的變數
    const envKeys = [
      import.meta.env.VITE_GEMINI_API_KEY_1,
      import.meta.env.VITE_GEMINI_API_KEY_2,
      import.meta.env.VITE_GEMINI_API_KEY_3,
      import.meta.env.VITE_GEMINI_API_KEY_4,
      import.meta.env.VITE_GEMINI_API_KEY_5,
    ].filter(Boolean) as string[];

    this.keys = envKeys;

    // 如果環境變數中沒有金鑰，讀取 VITE_GEMINI_API_KEY 作為單一備用
    if (this.keys.length === 0) {
      const fallback = import.meta.env.VITE_GEMINI_API_KEY;
      if (fallback) {
        this.keys = [fallback];
        console.log('[ApiKeyManager] 使用 VITE_GEMINI_API_KEY 備用金鑰');
      } else {
        console.warn('[ApiKeyManager] 未設定任何 Gemini API Key，AI 功能將無法使用');
      }
    }
  }

  getCurrentKey(): string {
    if (this.keys.length === 0) return "";
    return this.keys[this.currentIndex];
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotalKeys(): number {
    return this.keys.length;
  }

  rotateKey(): string {
    if (this.keys.length <= 1) return this.getCurrentKey();
    
    this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    this.notifyListeners();
    return this.getCurrentKey();
  }

  onKeyChange(callback: (index: number) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l(this.currentIndex));
  }
}

export const apiKeyManager = new ApiKeyManager();
