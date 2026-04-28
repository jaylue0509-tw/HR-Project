import express from 'express';
import cors from 'cors';
import { setupDB } from './db.js';

const SHEETS_WEBHOOK = 'https://script.google.com/macros/s/AKfycbySnwVPR0W1pE3JN2MW2Bx6nFAtTRzoPkLCscw4DSqQVf6N_ZndbOp2VSsBJQZdn7Eu/exec';

// Build merged row data from DB then POST to Google Sheets
async function syncToGoogleSheets() {
  try {
    const users = await db.all('SELECT * FROM users');
    const assessments = await db.all('SELECT * FROM assessments');

    const rows = users.map(u => {
      const a = assessments.find(r => r.userEmail === u.email) || {};
      const computed = a.computed ? JSON.parse(a.computed) : {};
      const review = a.supervisorReview ? JSON.parse(a.supervisorReview) : {};
      const data = a.data ? JSON.parse(a.data) : {};
      const scores = data.scores || {};
      return {
        // 員工基本資料
        '公司': u.company,
        '部門': u.department,
        '姓名': u.name,
        'Email': u.email,
        '職稱': u.title,
        '主管姓名': u.supervisorName,
        '主管Email': u.supervisorEmail,
        // 填寫狀況
        '填寫狀態': a.status || '未填寫',
        '填寫時間': a.submittedAt ? new Date(a.submittedAt).toLocaleString('zh-TW') : '',
        // 常用工具
        '常用AI工具': data.tools || '',
        '使用頻率': data.frequency || '',
        // 10項能力指標 (1-5分)
        '文字生成': scores.textGeneration || '',
        '內容整理': scores.contentOrganization || '',
        '工作提效': scores.workEfficiency || '',
        '流程優化': scores.processOptimization || '',
        '分析判讀': scores.analysis || '',
        '決策支援': scores.decisionSupport || '',
        '創意生成': scores.ideaGeneration || '',
        '專業應用': scores.professionalApplication || '',
        '結構設計': scores.structureDesign || '',
        '機器人建置': scores.botConstruction || '',
        // 5大領域分數 (0-10)
        '內容應用型': computed.domainContent ?? '',
        '流程優化型': computed.domainEfficiency ?? '',
        '數據分析型': computed.domainAnalysis ?? '',
        '策略/設計型': computed.domainInnovation ?? '',
        '機器人建置型': computed.domainIntegration ?? '',
        // 成就累計
        '廣度': computed.breadth ?? '',
        '深度': computed.depth ?? '',
        '綜合分數': computed.comprehensiveScore ?? '',
        '核心強項': computed.coreStrengths || '',
        '人才型態': computed.talentType || '',
        // 主管覆核
        '最終評級': review.finalGrade || '',
        '主管評語': review.comments || '',
        '證據狀態': review.evidenceStatus || '',
        '覆核時間': review.reviewedAt ? new Date(review.reviewedAt).toLocaleString('zh-TW') : '',
      };
    });

    const response = await fetch(SHEETS_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // Apps Script needs text/plain to avoid CORS preflight
      body: JSON.stringify(rows),
    });
    const result = await response.text();
    console.log('📊 Synced to Google Sheets:', result);
  } catch (err) {
    console.error('❌ Failed to sync to Google Sheets:', err.message);
  }
}

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let db;

setupDB().then(database => {
  db = database;
  console.log('✅ SQLite database initialized.');
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  const users = req.body;
  if (!Array.isArray(users)) {
    return res.status(400).json({ error: 'Expected an array of users' });
  }

  try {
    // Delete all existing users and re-insert (mirrors frontend replace-all behavior)
    // Assessments are kept — they reference email which stays intact
    await db.run('DELETE FROM users');

    const stmt = await db.prepare(`
      INSERT INTO users (email, name, company, department, title, supervisorName, supervisorEmail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const u of users) {
      await stmt.run(u.email, u.name, u.company, u.department, u.title, u.supervisorName, u.supervisorEmail);
    }
    await stmt.finalize();

    res.json({ message: 'Users saved successfully' });
    syncToGoogleSheets(); // fire-and-forget
  } catch (error) {
    res.status(500).json({ error: 'Failed to save users' });
  }
});

// Assessments
app.get('/api/assessments', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM assessments');
    const assessments = rows.map(r => ({
      userEmail: r.userEmail,
      status: r.status,
      submittedAt: r.submittedAt,
      data: r.data ? JSON.parse(r.data) : undefined,
      computed: r.computed ? JSON.parse(r.computed) : undefined,
      supervisorReview: r.supervisorReview ? JSON.parse(r.supervisorReview) : undefined
    }));
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
});

app.post('/api/assessments', async (req, res) => {
  const record = req.body;
  try {
    const { userEmail, status, submittedAt, data, computed, supervisorReview } = record;
    
    await db.run(`
      INSERT OR REPLACE INTO assessments (userEmail, status, submittedAt, data, computed, supervisorReview)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userEmail, 
      status, 
      submittedAt, 
      data ? JSON.stringify(data) : null, 
      computed ? JSON.stringify(computed) : null, 
      supervisorReview ? JSON.stringify(supervisorReview) : null
    ]);

    res.json({ message: 'Assessment saved successfully' });
    syncToGoogleSheets(); // fire-and-forget
  } catch (error) {
    res.status(500).json({ error: 'Failed to save assessment' });
  }
});

// Stats: 最後填寫狀況、主管回覆狀況、等級分佈
app.get('/api/stats', async (req, res) => {
  try {
    const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
    const assessments = await db.all('SELECT * FROM assessments');

    const totalUsers = usersCount.count;
    let submittedCount = 0;
    let reviewedCount = 0;
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, E: 0 };

    assessments.forEach(a => {
      if (a.status === 'Submitted' || a.status === 'Reviewed') {
        submittedCount++;
      }
      if (a.status === 'Reviewed' && a.supervisorReview) {
        reviewedCount++;
        const review = JSON.parse(a.supervisorReview);
        if (review.finalGrade && gradeDistribution[review.finalGrade] !== undefined) {
          gradeDistribution[review.finalGrade]++;
        }
      }
    });

    res.json({
      completionStatus: {
        total: totalUsers,
        submitted: submittedCount,
        rate: totalUsers ? ((submittedCount / totalUsers) * 100).toFixed(1) + '%' : '0%'
      },
      supervisorResponseStatus: {
        totalSubmitted: submittedCount,
        reviewed: reviewedCount,
        rate: submittedCount ? ((reviewedCount / submittedCount) * 100).toFixed(1) + '%' : '0%'
      },
      gradeDistribution
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

import * as XLSX from 'xlsx';

app.get('/api/export', async (req, res) => {
  try {
    const users = await db.all('SELECT * FROM users');
    const assessments = await db.all('SELECT * FROM assessments');
    
    // Merge data for export
    const exportData = users.map(u => {
      const a = assessments.find(record => record.userEmail === u.email) || {};
      const computed = a.computed ? JSON.parse(a.computed) : {};
      const review = a.supervisorReview ? JSON.parse(a.supervisorReview) : {};
      const data = a.data ? JSON.parse(a.data) : {};
      
      return {
        '公司': u.company,
        '部門': u.department,
        '姓名': u.name,
        'Email': u.email,
        '主管': u.supervisorName,
        '狀態': a.status || '未填寫',
        '填寫時間': a.submittedAt || '',
        '綜合分數': computed.comprehensiveScore || '',
        '最終評級': review.finalGrade || '',
        '主管評語': review.comments || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '評核資料');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="hr_export.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export excel' });
  }
});

app.get('/api/sync', async (req, res) => {
  try {
    await syncToGoogleSheets();
    res.json({ message: 'Synced to Google Sheets successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Backend server is running at http://localhost:${port}`);
});
