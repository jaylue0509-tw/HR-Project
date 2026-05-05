
export class ApiKeyManager {
  private keys: string[] = [];
  private currentIndex: number = 0;
  private listeners: ((index: number) => void)[] = [];

  constructor() {
    this.initializeKeys();
  }

  private initializeKeys() {
    // 優先讀取 .env 中的變數
    const metaEnv = (import.meta as any).env || {};
    const envKeys = [
      metaEnv.VITE_GEMINI_API_KEY_1,
      metaEnv.VITE_GEMINI_API_KEY_2,
      metaEnv.VITE_GEMINI_API_KEY_3,
      metaEnv.VITE_GEMINI_API_KEY_4,
      metaEnv.VITE_GEMINI_API_KEY_5,
    ].filter(Boolean) as string[];

    this.keys = envKeys;
    
    // 如果環境變數中沒有金鑰，則提供預設金鑰 (與 Proxy 同步)
    if (this.keys.length === 0) {
      this.keys = [
        "AIzaSyB2tAlOs0BjKyRRTVH4kIB9Ss-JoUJhsJc" // 新的 API Key
      ];
      console.log("[ApiKeyManager] 使用預設備用金鑰");
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
