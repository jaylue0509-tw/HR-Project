<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/519d3714-2093-4b5d-a3a7-08e42f80c121

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## 最近更新紀錄 (Project Setup & Deployment)

1. **套件安裝與運行確認**：已檢查 `package.json`，並執行 `npm install` 與 `npm run build` 確認專案可以正常編譯運行。
2. **自動部署設定 (GitHub Actions)**：
   - 已建立 `.github/workflows/deploy.yml` 腳本。
   - `vite.config.ts` 中已將 `base` 路徑設定為 `./` 以支援相對路徑載入。
   - 推播程式碼到 `main` 或 `master` 分支後，GitHub Actions 將會自動將專案編譯並發布至 **GitHub Pages**。
   - *注意：若要使用 GitHub Pages，請務必至 GitHub 專案設定的 "Pages" 頁籤中，將 Source 設為 "GitHub Actions"以正確觸發部署。*
3. **過濾不需要的檔案 (.gitignore)**：已優化 `.gitignore`，防止 `node_modules`、打包輸出的 `dist`/`build` 資料夾、系統與編輯器暫存檔以及 `.env` 等敏感檔案被上傳到儲存庫。
