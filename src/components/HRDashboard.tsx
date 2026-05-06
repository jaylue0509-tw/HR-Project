import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { User, AssessmentRecord } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import RadarProfile from './RadarProfile';
import HRAccountManager from './HRAccountManager';
import TalentProfile from './TalentProfile';
import GradeAnalytics from './GradeAnalytics';

// Mapping for 10 abilities
const ABILITIES = [
  { key: 'contentOrganization', code: 'C02', title: '內容整理', desc: '利用 AI 整理、摘要、歸納大量資訊或文件' },
  { key: 'workEfficiency', code: 'C03', title: '工作提效', desc: '利用 AI 加速日常工作任務，縮短完成時間' },
  { key: 'processOptimization', code: 'C04', title: '流程優化', desc: '利用 AI 重新設計或改善既有工作流程' },
  { key: 'analysis', code: 'C05', title: '分析判讀', desc: '利用 AI 分析資料、圖表或報告並產出洞察' },
  { key: 'decisionSupport', code: 'C06', title: '決策支援', desc: '利用 AI 輔助評估選項、風險分析或決策建議' },
  { key: 'ideaGeneration', code: 'C07', title: '創意生成', desc: '利用 AI 進行創意發想、概念生成或腦力激盪' },
  { key: 'professionalApplication', code: 'C08', title: '專業應用', desc: '在特定專業領域 (法務/財務/設計等) 深度應用 AI' },
  { key: 'textGeneration', code: 'C09', title: '簡報企劃', desc: '利用 AI 設計簡報架構、企劃書或結構化輸出' }, // Adjusted title to match screenshot
  { key: 'structureDesign', code: 'C10', title: '結構設計', desc: '能系統化地建立 Prompt 系統或框架' },
  { key: 'botConstruction', code: 'C11', title: '自動化建置', desc: '能建置機器人，或已可打造自動化工作流' }
];

const getFeedbackText = (score: number) => {
  if (score >= 9) return '高度成熟，可複製方法並帶動他人';
  if (score >= 7) return '應用熟練，能穩定產出高質量結果';
  if (score >= 5) return '具備基礎能力，能應付日常需求';
  return '仍在探索階段，需加強實作經驗';
};

const AbilityCard = ({ item, employeeScore, supervisorScore }: any) => {
  // Convert 1-5 scale to 1-10 scale
  const eScore10 = (employeeScore || 0) * 2;
  const sScore10 = supervisorScore !== undefined ? supervisorScore * 2 : eScore10;
  const percentage = (sScore10 / 10) * 100;
  
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-slate-800 text-sm mb-1">{item.code} {item.title}</div>
          <div className="text-[11px] text-slate-500 leading-relaxed pr-2">{item.desc}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
            <span>★ 員工自評</span>
            <span>{eScore10.toFixed(1)}/10</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-bold text-slate-700">判核決定</span>
          <span className="font-bold text-violet-600">{sScore10.toFixed(1)}/10</span>
        </div>
        <div className="text-[10px] text-slate-400 mb-3">主管覆核判定</div>
        
        {/* Slider track */}
        <div className="relative h-2.5 bg-slate-100 rounded-full w-full">
          <div className="absolute top-0 left-0 h-full bg-green-100 rounded-l-full" style={{ width: `${percentage}%` }}></div>
          <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-[3px] border-violet-500 rounded-full shadow-sm" style={{ left: `calc(${percentage}% - 10px)` }}></div>
        </div>
      </div>
      
      <div className="bg-green-50/70 text-green-700 text-[11px] font-medium px-3 py-2.5 rounded-lg flex items-center gap-2 mt-auto border border-green-100">
        <span className="text-green-500">◎</span> {getFeedbackText(sScore10)}
      </div>
    </div>
  );
};

export default function HRDashboard() {
  const { users, hrAccount, logout, refreshUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'home' | 'employees' | 'overview' | 'talent' | 'analytics'>('talent');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detail View State
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Assessments — real-time sync: refreshed whenever Firebase pushes hr_data_changed
  const [assessments, setAssessments] = useState<AssessmentRecord[]>(() => dataService.getAssessments());
  useEffect(() => {
    const refresh = () => setAssessments(dataService.getAssessments());
    window.addEventListener('hr_data_changed', refresh);
    return () => window.removeEventListener('hr_data_changed', refresh);
  }, []);

  // Import State
  const [csvText, setCsvText] = useState('');
  const [msg, setMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Import Logic ---
  const sanitizeRow = (row: any): User => {
    const rawEmail = row['e-Mail帳號'] || row['e-mail帳號'] || row['Email'] || row['EMAIL'] || row['email'] || '';
    const rawSupEmail = row['主管 e-Mail帳號'] || row['主管 e-mail帳號'] || row['主管Email'] || row['主管EMAIL'] || row['supervisorEmail'] || '';
    return {
      company: String(row['公司別'] || row['公司'] || row['Company'] || '').trim(),
      department: String(row['部門中文名稱'] || row['部門'] || row['Department'] || '').trim(),
      name: String(row['中文姓名'] || row['姓名'] || row['Name'] || '').replace(/\s+/g, ''),
      title: String(row['職務中文名稱'] || row['職稱'] || row['Title'] || '').trim(),
      email: String(rawEmail).replace(/\s+/g, '').toLowerCase(),
      supervisorName: String(row['主管'] || row['主管姓名'] || row['Supervisor'] || '').replace(/\s+/g, ''),
      supervisorEmail: String(rawSupEmail).replace(/\s+/g, '').toLowerCase(),
    };
  };

  const processImport = async (importedUsers: User[]) => {
    const validUsers = importedUsers.filter(u => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email));
    if (validUsers.length === 0) {
      setMsg('資料格式不正確，找不到 Email 欄位。');
      return;
    }
    const existingUsers = dataService.getUsers();
    const userMap = new Map<string, User>();
    existingUsers.forEach(u => userMap.set(u.email, u));
    validUsers.forEach(u => userMap.set(u.email, u));
    const mergedUsers = Array.from(userMap.values());

    setMsg('同步資料中...');
    try {
      await dataService.setUsers(mergedUsers);
      refreshUsers();
      setMsg(`成功合併導入 ${validUsers.length} 筆資料！總共 ${mergedUsers.length} 筆員工。`);
    } catch {
      setMsg('同步失敗，請檢查網路。');
    }
  };

  const handleImportCSV = () => {
    Papa.parse<any>(csvText, {
      header: true, skipEmptyLines: true,
      complete: (results) => processImport(results.data.map(sanitizeRow))
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        processImport(jsonData.map(sanitizeRow));
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        setMsg('Excel 解析失敗。');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportExcel = () => {
    if (!hrAccount?.canExport) {
      alert('您沒有匯出資料的權限');
      return;
    }
    const exportData = users.map(u => {
      const rec = dataService.getAssessmentByEmail(u.email);
      return {
        '公司別': u.company, '部門': u.department, '姓名': u.name, 'Email': u.email,
        '狀態': !rec ? '未填寫' : rec.status === 'Reviewed' ? '已覆核' : '待覆核',
        '最終判定等級': rec?.supervisorReview?.finalGrade || '',
        '綜合分數': rec?.computed?.comprehensiveScore || '',
        '人才型態': rec?.computed?.talentType || ''
      };
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HR人才庫");
    XLSX.writeFile(wb, `人才庫匯出_${new Date().toLocaleDateString().replace(/\//g, '')}.xlsx`);
  };

  // --- Data Preparation ---
  const allAssessments = assessments;
  const getRecord = (email: string) => allAssessments.find(a => a.userEmail === email);
  
  const filteredUsers = users.filter(u => 
    u.name.includes(searchTerm) || u.department.includes(searchTerm) || u.email.includes(searchTerm)
  );

  const stats = {
    total: users.length,
    completed: allAssessments.filter(a => a.status === 'Submitted' || a.status === 'Reviewed').length,
    pending: allAssessments.filter(a => a.status === 'Submitted').length,
    reviewed: allAssessments.filter(a => a.status === 'Reviewed').length,
  };
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // --- Detailed View (The "全貌" Page) ---
  if (selectedRecord && selectedUser) {
    return (
      <div className="bg-[#F4F6F8] min-h-screen p-6 font-sans">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedUser.name} <span className="text-sm font-normal text-slate-500 ml-2">{selectedUser.department} / {selectedUser.title}</span></h2>
              </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">綜合評核分數</div>
                <div className="text-2xl font-black text-violet-600">{selectedRecord.computed?.comprehensiveScore} <span className="text-sm font-medium text-slate-400">/ 10</span></div>
              </div>
              <div className="w-px h-10 bg-slate-200"></div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">最終判定</div>
                <div className="text-2xl font-black text-slate-800">{selectedRecord.supervisorReview?.finalGrade || '-'} 級</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column: Abilities Grid */}
            <div className="xl:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h3 className="font-bold text-lg text-slate-800">能力覆核評分 (1-10)</h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    拖曳滑桿調整各項能力的分數 (主管權限)
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ABILITIES.map(item => (
                    <AbilityCard 
                      key={item.key} 
                      item={item} 
                      employeeScore={selectedRecord.data?.scores?.[item.key as keyof typeof selectedRecord.data.scores]}
                      supervisorScore={selectedRecord.data?.scores?.[item.key as keyof typeof selectedRecord.data.scores]} // In future, this could be separate
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Radar & Evidence */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">自評雷達圖</h3>
                <div className="h-64">
                  {selectedRecord.computed && <RadarProfile computed={selectedRecord.computed} />}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">成果與證據</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">量化成效</div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedRecord.data?.evidenceDesc || '未提供'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">連結 / 附件</div>
                    {selectedRecord.data?.evidenceLink ? (
                      <div className="space-y-2">
                        {selectedRecord.data.evidenceLink.split('\n').filter(link => link.trim()).map((link, i) => (
                          <a key={i} href={link.trim().startsWith('http') ? link.trim() : `https://${link.trim()}`} 
                             target="_blank" rel="noopener noreferrer" 
                             className="text-violet-600 hover:text-violet-700 hover:underline block break-all text-xs bg-violet-50 p-2.5 rounded-lg border border-violet-100 transition-colors">
                            🔗 {link.trim()}
                          </a>
                        ))}
                      </div>
                    ) : <span className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 block">未提供</span>}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-4">主管評語</h3>
                <div className="text-sm text-slate-700 bg-blue-50 p-4 rounded-xl border border-blue-100 whitespace-pre-wrap">
                  {selectedRecord.supervisorReview?.comments || '主管尚未填寫評語'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Layout ---
  return (
    <div className="flex h-[calc(100vh-80px)] -mx-6 -my-6 bg-[#F4F6F8]">
      {/* Left Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-violet-200">AI</div>
            <span className="font-black text-slate-800 text-lg tracking-tight">東森集團人才評核</span>
          </div>
        </div>
        
        <div className="px-6 py-2">
          <div className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-wider">功能選單</div>
          <nav className="space-y-1.5">
            <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              HR 首頁
            </button>
            <button onClick={() => setActiveTab('employees')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'employees' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              員工管理
            </button>
            <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              評核總覽
            </button>
            <button onClick={() => setActiveTab('talent')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'talent' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"></path></svg>
              人才庫
            </button>
            <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-violet-600 text-white shadow-md shadow-violet-200/50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
              等級統計分析
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="px-8 py-6 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeTab === 'home' ? 'HR 首頁' : activeTab === 'employees' ? '員工管理' : activeTab === 'overview' ? '評核總覽' : activeTab === 'analytics' ? '等級統計分析' : '人才庫'}
            </h2>
            {activeTab === 'overview' && <p className="text-sm text-slate-500 mt-1">監控全集團評核參與進度、核定狀況與分數分佈</p>}
          </div>
          {activeTab === 'talent' && (
            <button onClick={handleExportExcel} className="px-4 py-2 bg-white text-slate-700 font-medium rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              匯出
            </button>
          )}
        </div>

        <div className="px-8 pb-8 space-y-6">
          
          {activeTab === 'home' && (
             <div className="text-slate-500 text-center py-20">歡迎來到 HR 管理控制台。請從左側選單選擇功能。</div>
          )}

          {activeTab === 'analytics' && (
            <GradeAnalytics
              users={users}
              records={dataService.getAssessments()}
              title="全公司"
            />
          )}

          {activeTab === 'employees' && (
            <>
              {hrAccount?.canImport && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                  <h3 className="font-bold text-slate-800 mb-4">資料導入區</h3>
                  <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="w-full h-32 rounded-xl border-slate-300 p-4 text-sm focus:border-violet-400 focus:ring-1 focus:ring-violet-400 bg-slate-50 transition-all mb-4" placeholder="貼上 CSV 內容..."/>
                  <div className="flex gap-3">
                    <button onClick={handleImportCSV} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900">導入文字資料</button>
                    <input type="file" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleExcelImport} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">匯入 Excel</button>
                    {msg && <span className="text-sm text-green-600 font-medium ml-2 self-center">{msg}</span>}
                  </div>
                </div>
              )}
              {hrAccount?.canManageAccounts && <HRAccountManager />}
            </>
          )}

          {(activeTab === 'overview' || activeTab === 'talent') && (
            <>
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-500 mb-1">完成率</div>
                      <div className="text-2xl font-bold text-slate-800">{completionRate}%</div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-500 mb-1">待主管審核</div>
                      <div className="text-2xl font-bold text-slate-800">{stats.pending}</div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-500 mb-1">已核定</div>
                      <div className="text-2xl font-bold text-slate-800">{stats.reviewed}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="flex-1 relative">
                  <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  <input 
                    type="text" 
                    placeholder={activeTab === 'overview' ? "搜尋員工、部門、評核名稱..." : "搜尋姓名 / 部門"}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-violet-500 text-sm outline-none transition-shadow"
                  />
                </div>
                {activeTab === 'talent' && (
                  <div className="flex gap-2">
                    <select className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-violet-500">
                      <option>全部等級</option>
                      <option>A級</option>
                      <option>B級</option>
                    </select>
                    <select className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-violet-500">
                      <option>全部 (人才型態)</option>
                    </select>
                    <select className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-600 outline-none focus:ring-2 focus:ring-violet-500">
                      <option>全部 (事業體)</option>
                    </select>
                  </div>
                )}
                {activeTab === 'overview' && (
                  <button className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl border border-slate-200 transition-colors flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
                    進階篩選
                  </button>
                )}
              </div>

              {/* Main Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-medium">
                    {activeTab === 'overview' && (
                      <tr>
                        <th className="px-6 py-4">受評人</th>
                        <th className="px-6 py-4">評核期間 / 名稱</th>
                        <th className="px-6 py-4">狀態</th>
                        <th className="px-6 py-4">最終分數</th>
                        <th className="px-6 py-4">更新日期</th>
                        <th className="px-6 py-4 text-center">操作</th>
                      </tr>
                    )}
                    {activeTab === 'talent' && (
                      <tr>
                        <th className="px-6 py-4">員工姓名</th>
                        <th className="px-6 py-4">部門</th>
                        <th className="px-6 py-4">等級</th>
                        <th className="px-6 py-4">綜合分數</th>
                        <th className="px-6 py-4">人才型態</th>
                        <th className="px-6 py-4">標籤</th>
                        <th className="px-6 py-4 text-center">操作</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u, idx) => {
                      const record = getRecord(u.email);
                      const isReviewed = record?.status === 'Reviewed';
                      if (activeTab === 'talent' && !isReviewed) return null; // Talent pool only shows reviewed
                      
                      const grade = record?.supervisorReview?.finalGrade || '-';
                      const score = record?.computed?.comprehensiveScore || '-';
                      const talentType = record?.computed?.talentType || '未定義';
                      
                      const gradeColor: Record<string, string> = {
                        A: 'text-purple-700',
                        B: 'text-emerald-600',
                        C: 'text-blue-600',
                        D: 'text-orange-500',
                        E: 'text-red-500',
                      };

                      if (activeTab === 'overview') {
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-slate-800">{u.name}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{u.department}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">未知期間</td>
                            <td className="px-6 py-4">
                              {isReviewed ? <span className="text-slate-600 font-medium">已核定</span> : 
                               record ? <span className="text-orange-600 font-medium">待審核</span> : 
                               <span className="text-slate-400">未填寫</span>}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700">{score}</td>
                            <td className="px-6 py-4 text-slate-500">None</td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                disabled={!record}
                                onClick={() => { setSelectedRecord(record!); setSelectedUser(u); }}
                                className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                查看明細
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      if (activeTab === 'talent') {
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">{u.name}</td>
                            <td className="px-6 py-4 text-slate-600">{u.department}</td>
                            <td className="px-6 py-4">
                               <span className={`font-black ${gradeColor[grade] || 'text-slate-600'}`}>{grade} 級</span>
                            </td>
                            <td className="px-6 py-4 font-bold text-violet-600">{score}</td>
                            <td className="px-6 py-4 text-slate-600 text-xs font-medium">{talentType}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-1">
                                {record?.data?.tools.split(',').slice(0,2).map(t => t.trim()).filter(Boolean).map((t, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">{t}</span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button onClick={() => { setSelectedRecord(record!); setSelectedUser(u); }} className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm">
                                查看分析
                              </button>
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
