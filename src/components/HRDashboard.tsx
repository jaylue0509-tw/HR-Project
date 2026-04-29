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

          dataService.setUsers(importedUsers);
          refreshUsers();
          setMsg(`成功從 CSV 導入 ${importedUsers.length} 筆員工資料！`);
          setCsvText('');
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

        dataService.setUsers(importedUsers);
        refreshUsers();
        setMsg(`成功從 Excel 導入 ${importedUsers.length} 筆員工資料！`);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
              {hrAccount?.canManageAccounts ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">✓ 管理員</span> : null}
            </span>
          </p>
        </div>
        <button onClick={logout} className="text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors">登出</button>
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
          <div className="bg-white/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">資料導入區</h3>
            <p className="text-sm text-slate-500 mb-4">
              請貼上 CSV 格式內容，或使用 Excel 檔案匯入。<br/>
              對應欄位名稱：（包含即可，多的欄位如「序號、員工編號」會自動略過）<br/>
              <code>公司別, 部門中文名稱, 中文姓名, 職務中文名稱, e-Mail帳號, 主管, 主管 e-Mail帳號</code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full h-48 rounded-xl bg-white/50 backdrop-blur-sm border border-white/60 p-3 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:bg-white/70 transition-all mb-3"
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

          <div className="bg-white/40 backdrop-blur-xl p-6 rounded-2xl border border-white/60 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">目前員工名單 ({users.length})</h3>
            <div className="overflow-y-auto flex-1 max-h-64 border rounded-md">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-white/30 backdrop-blur-md border-b border-white/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">姓名</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">部門</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">主管 (姓名 / Email)</th>
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
          <div className="lg:col-span-1 bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-0 overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
               <h3 className="font-semibold text-slate-800">全體員工列表</h3>
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
                    className={`w-full text-left p-3 rounded-xl border transition-all backdrop-blur-sm ${
                      selectedUser?.email === u.email 
                        ? 'bg-blue-100/50 border-blue-300 ring-1 ring-blue-400 shadow-sm' 
                        : 'bg-white/40 border-white/50 hover:bg-white/60 hover:shadow-sm'
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
          <div className="lg:col-span-2 bg-white/40 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] border border-white/60 p-6 flex flex-col h-[700px] overflow-y-auto">
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                 請由左側選擇一名員工以檢視評核狀態
              </div>
            ) : !selectedRecord ? (
              <div className="flex-1 flex items-center justify-center flex-col text-slate-500">
                <div className="text-lg font-semibold mb-2">{selectedUser.name}</div>
                <div>該名員工尚未送出 AI 職能自評。</div>
              </div>
            ) : (
              <div className="space-y-6">
                
                <div className="border-b border-slate-200 pb-4 flex justify-between items-center">
                   <div>
                      <h3 className="text-xl font-bold text-slate-900">{selectedUser.name} 的 AI 職能自評</h3>
                      <span className="text-sm text-slate-500">人才型態：{selectedRecord.computed?.talentType}</span>
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
        </div>
      )}
      {activeTab === 'accounts' && (
        <HRAccountManager />
      )}
    </div>
  );
}
