import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { User, AssessmentRecord } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import RadarProfile from './RadarProfile';
import HRAccountManager from './HRAccountManager';

export default function HRDashboard() {
  const { refreshUsers, users, hrAccount, logout } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'import' | 'overview' | 'accounts'>('import');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | undefined>(undefined);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [editUserForm, setEditUserForm] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = () => {
    Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const importedUsers: User[] = results.data.map((row: any) => ({
            company: row['公司別'] || row['公司'] || row['Company'] || '',
            department: row['部門中文名稱'] || row['部門'] || row['Department'] || '',
            name: row['中文姓名'] || row['姓名'] || row['Name'] || '',
            title: row['職務中文名稱'] || row['職稱'] || row['Title'] || '',
            email: (row['e-Mail帳號'] || row['e-mail帳號'] || row['Email'] || row['EMAIL'] || row['email'] || '').trim(),
            supervisorName: row['主管'] || row['主管姓名'] || row['Supervisor'] || '',
            supervisorEmail: (row['主管 e-Mail帳號'] || row['主管 e-mail帳號'] || row['主管Email'] || row['主管EMAIL'] || row['supervisorEmail'] || '').trim(),
          }));
          
          if (importedUsers.length === 0 || !importedUsers[0].email) {
            setMsg('資料格式不正確，找不到 Email 欄位。');
            return;
          }

          // 取得現有使用者並與新資料合併（以 email 為唯一鍵值）
          const existingUsers = dataService.getUsers();
          const userMap = new Map<string, User>();
          existingUsers.forEach(u => userMap.set(u.email, u));
          importedUsers.forEach(u => userMap.set(u.email, u));
          const mergedUsers = Array.from(userMap.values());

          setMsg('同步資料中...');
          dataService.setUsers(mergedUsers).then(() => {
            refreshUsers();
            setMsg(`成功合併導入 ${importedUsers.length} 筆資料！總共 ${mergedUsers.length} 筆員工。`);
            setCsvText('');
          }).catch(() => {
            setMsg('同步至後台失敗，請檢查網路連線。');
          });
        } catch (e) {
          setMsg('解析失敗，請確認欄位名稱。');
        }
      }
    });
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);
        
        const importedUsers: User[] = jsonData.map((row: any) => ({
          company: row['公司別'] || row['公司'] || row['Company'] || '',
          department: row['部門中文名稱'] || row['部門'] || row['Department'] || '',
          name: row['中文姓名'] || row['姓名'] || row['Name'] || '',
          title: row['職務中文名稱'] || row['職稱'] || row['Title'] || '',
          email: (row['e-Mail帳號'] || row['e-mail帳號'] || row['Email'] || row['EMAIL'] || row['email'] || '').trim(),
          supervisorName: row['主管'] || row['主管姓名'] || row['Supervisor'] || '',
          supervisorEmail: (row['主管 e-Mail帳號'] || row['主管 e-mail帳號'] || row['主管Email'] || row['主管EMAIL'] || row['supervisorEmail'] || '').trim(),
        }));

        if (importedUsers.length === 0 || !importedUsers[0].email) {
          setMsg('Excel 資料格式不正確，找不到 Email 欄位。');
          return;
        }

        // 取得現有使用者並與新資料合併（以 email 為唯一鍵值）
        const existingUsers = dataService.getUsers();
        const userMap = new Map<string, User>();
        existingUsers.forEach(u => userMap.set(u.email, u));
        importedUsers.forEach(u => userMap.set(u.email, u));
        const mergedUsers = Array.from(userMap.values());

        setMsg('同步資料中...');
        dataService.setUsers(mergedUsers).then(() => {
          refreshUsers();
          setMsg(`成功合併導入 ${importedUsers.length} 筆資料！總共 ${mergedUsers.length} 筆員工。`);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }).catch(() => {
          setMsg('同步至後台失敗，請檢查網路連線。');
        });
      } catch (err) {
        setMsg('Excel 解析失敗，請確認檔案格式與欄位名稱。');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const sampleCsv = `序號,公司別,部門中文名稱,員工編號,中文姓名,職務中文名稱,e-Mail帳號,主管,主管 e-Mail帳號
3,東森得易購,人資行政部人力資源處,A6I,曾慈君,人資專員,abin.tseng@ehsn.com.tw,呂紹君,f1665@ettoday.net
4,東森新媒體,管理部人資處,30573,黃乙軫,副理,sandy.bfc@ettoday.net,呂紹君,f1665@ettoday.net`;

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setSelectedRecord(dataService.getAssessmentByEmail(u.email));
    setIsEditingUser(false);
  };

  const handleSaveUserEdit = async () => {
    if (!editUserForm || !selectedUser) return;
    setMsg('儲存變更中...');
    try {
      const currentUsers = dataService.getUsers();
      const updatedUsers = currentUsers.map(u => u.email === selectedUser.email ? editUserForm : u);
      await dataService.setUsers(updatedUsers);
      refreshUsers();
      setSelectedUser(editUserForm);
      setIsEditingUser(false);
      setMsg('員工資料已更新！');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) {
      setMsg('更新失敗，請檢查網路。');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">HR 管理控制台</h2>
          <p className="text-sm text-slate-500 mt-1">
            登入身分：<strong>{hrAccount?.name}</strong>
            <span className="ml-3 space-x-2">
              {hrAccount?.canImport ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ 可導入</span> : null}
              {hrAccount?.canExport ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">✓ 可匯出</span> : null}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://docs.google.com/spreadsheets/d/1SH6dhN8LPuVyVgU1_y9UiBXFXVeK942quybsjFBZDgQ/edit?gid=1425362031#gid=1425362031"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors border border-green-200 shadow-sm"
          >
            📊 開啟後台 Excel 資料庫
          </a>
          <button onClick={logout} className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">登出</button>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('import')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'import' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          1. 資料管理 / 導入
        </button>
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          2. 全公司評核總覽
        </button>
        {hrAccount?.canManageAccounts ? (
          <button
            onClick={() => setActiveTab('accounts')}
            className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'accounts' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            3. 帳號管理 🔐
          </button>
        ) : null}
      </div>

      {activeTab === 'import' && (
        !hrAccount?.canImport ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-5xl mb-4">🔒</span>
            <p className="text-lg font-semibold">您的帳號沒有資料導入權限</p>
            <p className="text-sm mt-2">請聯絡管理員開通此功能</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <div className="apple-glass-thin rounded-[2rem] p-8">
            <h3 className="text-xl font-display font-semibold text-slate-800 mb-4">資料導入區</h3>
            <p className="text-sm text-slate-500 mb-4">
              請貼上 CSV 格式內容，或使用 Excel 檔案匯入。<br/>
              對應欄位名稱：（包含即可，多的欄位如「序號、員工編號」會自動略過）<br/>
              <code>公司別, 部門中文名稱, 中文姓名, 職務中文名稱, e-Mail帳號, 主管, 主管 e-Mail帳號</code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full h-48 rounded-xl apple-glass-ultra-thin border-white/60 p-4 text-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-400 focus:bg-white/70 transition-all mb-4"
              placeholder={sampleCsv}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700"
              >
                導入文字資料
              </button>
              
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                ref={fileInputRef}
                onChange={handleExcelImport}
                className="hidden" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-green-700"
              >
                匯入 Excel
              </button>

              <button
                onClick={() => setCsvText(sampleCsv)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-sm font-medium shadow-sm hover:bg-slate-200"
              >
                載入測試資料
              </button>
              <button
                onClick={() => {
                  const testUsers = dataService.getUsers();
                  if (testUsers.length > 0) {
                     testUsers.forEach((u, idx) => {
                       const randomScore = () => Math.floor(Math.random() * 3) + 2; // 2 to 4
                       const scores = {
                           textGeneration: randomScore(), contentOrganization: randomScore(), workEfficiency: randomScore(), processOptimization: randomScore(), analysis: randomScore(), decisionSupport: randomScore(), ideaGeneration: randomScore(), professionalApplication: randomScore(), structureDesign: randomScore(), botConstruction: randomScore()
                       };
                       const isReviewed = idx % 3 === 0; // 1/3 are reviewed
                       
                       const record: AssessmentRecord = {
                         userEmail: u.email,
                         status: isReviewed ? 'Reviewed' : 'Submitted',
                         submittedAt: new Date().toISOString(),
                         data: {
                           tools: idx % 2 === 0 ? 'ChatGPT, Claude' : 'Midjourney, Stable Diffusion',
                           frequency: idx % 2 === 0 ? '每天多次' : '每週幾次',
                           botNames: idx % 2 === 0 ? 'HR助理, 週報小幫手' : '',
                           botCount: idx % 2 === 0 ? 2 : 0,
                           scores,
                           evidenceDesc: '優化流程，提升效率 20%',
                           evidenceLink: 'https://example.com/evidence'
                         },
                         computed: dataService.computeAssessment(scores)
                       };
                       
                       if (isReviewed) {
                         // Mock supervisor review
                         const review = {
                           impactScore: Math.floor(Math.random() * 3) + 2,
                           evidenceStatus: 'Approved' as const,
                           comments: '表現不錯，繼續保持。',
                           reviewedAt: new Date().toISOString(),
                           finalGrade: 'B' as any
                         };
                         review.finalGrade = dataService.calculateFinalGrade(record.computed!, review);
                         record.supervisorReview = review;
                       }
                       
                       dataService.saveAssessment(record);
                     });
                     
                     setMsg(`已為 ${testUsers.length} 位員工自動產出測試評核紀錄！`);
                  } else {
                     setMsg('請先匯入名單資料，再自動產生測試評核！');
                  }
                }}
                className="px-4 py-2 bg-indigo-500/80 backdrop-blur-md text-white rounded-xl text-sm font-medium shadow-md hover:bg-indigo-600 border border-white/20 transition-all"
              >
                自動產生全體測試評核
              </button>
              {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
            </div>
          </div>

          <div className="apple-glass-thin rounded-[2rem] p-8 flex flex-col">
            <h3 className="text-xl font-display font-semibold text-slate-800 mb-4">目前員工名單 ({users.length})</h3>
            <div className="overflow-y-auto flex-1 max-h-64 border rounded-md">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-white/30 backdrop-blur-md border-b border-white/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">姓名</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">公司信箱</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">部門</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">主管 (姓名 / 公司信箱)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40 bg-transparent">
                  {users.map((u, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 whitespace-nowrap">{u.name}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">{u.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{u.department}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-500">
                        {u.supervisorName}<br/><span className="text-xs">{u.supervisorEmail}</span>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                        尚未導入任何資料
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
          {/* Left: Team List */}
          <div className="lg:col-span-1 apple-glass-thin rounded-[2rem] p-0 overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 bg-slate-50/50 backdrop-blur border-b border-slate-200">
               <h3 className="font-display text-xl font-semibold text-slate-800">全體員工列表</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-white/20 backdrop-blur-sm">
              {users.map((u, idx) => {
                const rec = dataService.getAssessmentByEmail(u.email);
                const statusColor = !rec ? 'bg-slate-100 text-slate-500' 
                                  : rec.status === 'Reviewed' ? 'bg-green-100 text-green-700' 
                                  : 'bg-blue-100 text-blue-700';
                const statusText = !rec ? '未送出' : rec.status === 'Reviewed' ? `已覆核 (${rec.supervisorReview?.finalGrade} 級)` : '待主管覆核';

                return (
                  <button 
                    key={idx} 
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${
                      selectedUser?.email === u.email 
                        ? 'bg-white border-slate-300 shadow-md scale-[1.02] z-10 relative' 
                        : 'apple-glass-ultra-thin hover:bg-white/60 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">{u.name} <span className="text-slate-500 font-normal ml-1">({u.department})</span></div>
                        <div className="text-xs text-slate-500">{u.title} • 主管: {u.supervisorName} ({u.supervisorEmail})</div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${statusColor}`}>
                        {statusText}
                      </span>
                    </div>
                  </button>
                );
              })}
              {users.length === 0 && (
                <div className="p-4 text-center text-sm text-slate-500">
                  尚未導入任何員工資料
                </div>
              )}
            </div>
          </div>

          {/* Right: Review detail */}
          <div className="lg:col-span-2 apple-glass-thin rounded-[2rem] p-8 flex flex-col h-[700px] overflow-y-auto relative">
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                 請由左側選擇一名員工以檢視或編輯狀態
              </div>
            ) : isEditingUser && editUserForm ? (
              <div className="animate-in fade-in space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                  <h3 className="text-lg font-semibold text-slate-800">編輯員工資料</h3>
                  <div className="space-x-2">
                    <button onClick={() => setIsEditingUser(false)} className="px-3 py-1.5 text-sm bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">取消</button>
                    <button onClick={handleSaveUserEdit} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">儲存變更</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-slate-500 mb-1">姓名</label>
                    <input type="text" value={editUserForm.name} onChange={e => setEditUserForm({...editUserForm, name: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">公司信箱 <span className="text-xs text-red-400">(修改可能影響歷史紀錄)</span></label>
                    <input type="email" value={editUserForm.email} onChange={e => setEditUserForm({...editUserForm, email: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">公司別</label>
                    <input type="text" value={editUserForm.company} onChange={e => setEditUserForm({...editUserForm, company: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">部門</label>
                    <input type="text" value={editUserForm.department} onChange={e => setEditUserForm({...editUserForm, department: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">職稱</label>
                    <input type="text" value={editUserForm.title} onChange={e => setEditUserForm({...editUserForm, title: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div></div>
                  <div>
                    <label className="block text-slate-500 mb-1">主管姓名</label>
                    <input type="text" value={editUserForm.supervisorName} onChange={e => setEditUserForm({...editUserForm, supervisorName: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">主管公司信箱</label>
                    <input type="email" value={editUserForm.supervisorEmail} onChange={e => setEditUserForm({...editUserForm, supervisorEmail: e.target.value})} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="border-b border-slate-200 pb-4 mb-4 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      {selectedUser.name}
                      <button 
                        onClick={() => { setEditUserForm(selectedUser); setIsEditingUser(true); }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-normal border border-slate-200 transition-colors"
                      >
                        ✏️ 編輯資料
                      </button>
                    </h3>
                    <div className="text-sm text-slate-500 mt-1">
                      {selectedUser.company} • {selectedUser.department} • {selectedUser.title}
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <div>主管: {selectedUser.supervisorName}</div>
                    <div className="text-xs">{selectedUser.supervisorEmail}</div>
                  </div>
                </div>

                {!selectedRecord ? (
                  <div className="flex-1 flex items-center justify-center flex-col text-slate-500">
                    <div className="text-lg font-semibold mb-2">尚未提報</div>
                    <div>該名員工尚未送出 AI 職能自評。</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                       <div>
                          <span className="text-sm font-semibold text-slate-700">人才型態：</span>
                          <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{selectedRecord.computed?.talentType}</span>
                       </div>
                       <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">系統綜合分數</div>
                          <div className="text-2xl font-bold text-blue-600">{selectedRecord.computed?.comprehensiveScore}</div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div>
                          <h4 className="font-semibold text-slate-800 mb-2 border-l-4 border-blue-500 pl-2 text-sm">自評雷達圖</h4>
                          <div className="bg-slate-50 rounded-lg p-2 h-64">
                            {selectedRecord.computed && <RadarProfile computed={selectedRecord.computed} />}
                          </div>
                       </div>
                       <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-slate-800 mb-2 border-l-4 border-blue-500 pl-2 text-sm">成果與證據</h4>
                            <div className="bg-white/50 backdrop-blur-sm rounded-xl p-3 text-sm border border-white/60 h-64 overflow-y-auto space-y-3">
                               <div>
                                 <div className="text-xs text-slate-500 font-medium">量化成效</div>
                                 <p className="mt-1 text-slate-800">{selectedRecord.data?.evidenceDesc || '未提報'}</p>
                               </div>
                               <div>
                                 <div className="text-xs text-slate-500 font-medium">連結/附件</div>
                                 {selectedRecord.data?.evidenceLink ? (
                                   <a href={selectedRecord.data.evidenceLink} target="_blank" rel="noopener noreferrer" className="mt-1 text-blue-600 hover:underline block break-all">
                                     {selectedRecord.data.evidenceLink}
                                   </a>
                                 ) : <span className="mt-1 text-slate-800 block">未提供</span>}
                               </div>
                               <div>
                                 <div className="text-xs text-slate-500 font-medium">常用工具</div>
                                 <p className="mt-1 text-slate-800">{selectedRecord.data?.tools} ({selectedRecord.data?.frequency})</p>
                               </div>
                            </div>
                          </div>
                       </div>
                    </div>

                    {selectedRecord.supervisorReview && (
                      <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100 mt-4">
                        <h4 className="font-semibold text-slate-800 mb-4 border-l-4 border-blue-600 pl-2">主管覆核結果</h4>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-slate-500">成果成熟度 (Impact):</span>
                            <span className="ml-2 font-medium">{selectedRecord.supervisorReview.impactScore} 分</span>
                          </div>
                          <div>
                            <span className="text-slate-500">證據狀態:</span>
                            <span className="ml-2 font-medium">
                              {selectedRecord.supervisorReview.evidenceStatus === 'Approved' ? '認可可回放證據' : 
                               selectedRecord.supervisorReview.evidenceStatus === 'Rejected' ? '不符合標準' : 
                               selectedRecord.supervisorReview.evidenceStatus === 'Pending' ? '待確認' : '未提供'}
                            </span>
                          </div>
                        </div>
                        {selectedRecord.supervisorReview.comments && (
                          <div className="mb-4">
                            <span className="block text-slate-500 text-sm mb-1">主管評語:</span>
                            <p className="bg-white p-3 rounded border border-blue-100 text-sm text-slate-700">{selectedRecord.supervisorReview.comments}</p>
                          </div>
                        )}
                        <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 mt-4">
                          <span className="text-sm font-medium">最終判定評級</span>
                          <span className="font-bold text-xl text-blue-600">{selectedRecord.supervisorReview.finalGrade} 級</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'accounts' && (
        <HRAccountManager />
      )}
    </div>
  );
}
