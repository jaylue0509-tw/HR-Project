import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 載入 .env.local 
dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// 預設金鑰
const keys = [
  process.env.VITE_GEMINI_API_KEY_1 || "AIzaSyB2tAlOs0BjKyRRTVH4kIB9Ss-JoUJhsJc"
].filter(Boolean);

let currentIndex = 0;

// 代理所有請求
app.all('*', async (req, res) => {
  const path = req.path;
  
  // 忽略 favicon 等非 API 請求
  if (path.includes('favicon') || path === '/') {
    return res.status(404).send('Not Found');
  }

  const method = req.method;
  const body = req.body;
  const query = { ...req.query };
  
  // 移除原始請求中的 key
  delete query.key;
  const queryString = new URLSearchParams(query).toString();
  
  let attempts = 0;
  let lastErrorDetail = '';

  while (attempts < keys.length) {
    const currentKey = keys[currentIndex];
    const url = `https://generativelanguage.googleapis.com${path}?key=${currentKey}${queryString ? '&' + queryString : ''}`;
    
    try {
      console.log(`[${new Date().toLocaleTimeString()}] [Proxy] 使用 Key #${currentIndex + 1} 請求: ${path}`);
      
      const fetchOptions = {
        method,
        headers: { 
          'Content-Type': 'application/json'
        }
      };
      
      if (method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type');
      
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn(`[Proxy] 收到非 JSON 回應 (${response.status}):`, text.substring(0, 100));
        data = { error: '非 JSON 回應', raw: text };
      }

      // 如果是 429 (Too Many Requests) 或 403 (可能有配額限制) 或 400 (有時配額限制會報 400)
      if (response.status === 429 || (data.error && JSON.stringify(data.error).includes('quota'))) {
        console.warn(`[Proxy] Key #${currentIndex + 1} 觸發配額限制。自動切換中...`);
        currentIndex = (currentIndex + 1) % keys.length;
        attempts++;
        continue;
      }

      // 成功或其他錯誤直接回傳
      return res.status(response.status).json(data);
      
    } catch (error) {
      console.error(`[Proxy] 網路請求失敗:`, error);
      lastErrorDetail = error.message;
      attempts++;
      currentIndex = (currentIndex + 1) % keys.length;
    }
  }

  res.status(429).json({ 
    error: '所有可用 API Keys 均已嘗試但失敗。', 
    details: lastErrorDetail 
  });
});

const PORT = 3005;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n================================================`);
  console.log(`🚀 Gemini API 自動輪詢代理伺服器已優化！`);
  console.log(`📍 代理地址: http://localhost:${PORT}`);
  console.log(`🔑 金鑰池數量: ${keys.length}`);
  console.log(`================================================\n`);
});
