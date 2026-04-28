import React, { useState } from 'react';
import Papa from 'papaparse';
import { User, AssessmentRecord } from '../types';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import RadarProfile from './RadarProfile';

export default function HRDashboard() {
  const { refreshUsers, users } = useAuth();
  const [csvText, setCsvText] = useState('');
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'import' | 'overview'>('import');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AssessmentRecord | undefined>(undefined);

  const handleImport = () => {
    Papa.parse<any>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const importedUsers: User[] = results.data.map((row: any) => ({
            company: row['公司'] || row['Company'] || '',
            department: row['部門'] || row['Department'] || '',
            name: row['姓名'] || row['Name'] || '',
            title: row['職稱'] || row['Title'] || '',
            email: row['Email'] || row['EMAIL'] || '',
            supervisorName: row['主管'] || row['Supervisor'] || '',
            supervisorEmail: row['主管Email'] || row['主管EMAIL'] || '',
          }));
          
          if (importedUsers.length === 0 || !importedUsers[0].email) {
            setMsg('資料格式不正確，找不到 Email 欄位。');
            return;
          }

          dataService.setUsers(importedUsers);
          refreshUsers();
          setMsg(`成功導入 ${importedUsers.length} 筆員工資料！`);
          setCsvText('');
        } catch (e) {
          setMsg('解析失敗，請確認欄位名稱。');
        }
      }
    });
  };

  const sampleCsv = `公司,部門,姓名,職稱,EMAIL,主管,主管EMAIL
A公司,行銷部,王大明,專員,ming@test.com,李主管,lee@test.com
A公司,行銷部,陳小華,企劃,hua@test.com,李主管,lee@test.com
B公司,資訊部,張大智,工程師,zhi@test.com,趙主管,zhao@test.com
B公司,資訊部,林小美,設計師,mei@test.com,趙主管,zhao@test.com
B公司,人資部,周小黑,專員,hei@test.com,黃主管,huang@test.com`;

  const handleSelectUser = (u: User) => {
    setSelectedUser(u);
    setSelectedRecord(dataService.getAssessmentByEmail(u.email));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">HR 管理控制台</h2>
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
      </div>

      {activeTab === 'import' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">資料導入區</h3>
            <p className="text-sm text-slate-500 mb-4">
              請貼上 CSV 格式內容，必須包含以下欄位：<br/>
              <code>公司, 部門, 姓名, 職稱, EMAIL, 主管, 主管EMAIL</code>
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full h-48 rounded-md border border-slate-300 p-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 mb-3"
              placeholder={sampleCsv}
            />
            <div className="flex items-center space-x-4">
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700"
              >
                確認導入
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
                     const u = testUsers[0]; // mock for first user
                     dataService.saveAssessment({
                       userEmail: u.email,
                       status: 'Submitted',
                       submittedAt: new Date().toISOString(),
                       data: {
                         tools: 'ChatGPT, Claude', frequency: '每天多次',
                         scores: {
                           textGeneration: 4, contentOrganization: 4, workEfficiency: 4, processOptimization: 3, analysis: 3, decisionSupport: 3, ideaGeneration: 3, professionalApplication: 3, structureDesign: 2, botConstruction: 2
                         },
                         evidenceDesc: '每週節省約 5 小時',
                         evidenceLink: 'https://example.com/evidence'
                       },
                       computed: dataService.computeAssessment({
                           textGeneration: 4, contentOrganization: 4, workEfficiency: 4, processOptimization: 3, analysis: 3, decisionSupport: 3, ideaGeneration: 3, professionalApplication: 3, structureDesign: 2, botConstruction: 2
                       })
                     });
                     
                     if (testUsers.length > 1) {
                        const u2 = testUsers[1];
                        dataService.saveAssessment({
                           userEmail: u2.email,
                           status: 'Submitted',
                           submittedAt: new Date().toISOString(),
                           data: {
                             tools: 'Midjourney, Claude', frequency: '每週多次',
                             scores: {
                               textGeneration: 3, contentOrganization: 3, workEfficiency: 3, processOptimization: 3, analysis: 4, decisionSupport: 4, ideaGeneration: 4, professionalApplication: 4, structureDesign: 3, botConstruction: 2
                             },
                             evidenceDesc: '製作行銷素材速度提升 30%',
                             evidenceLink: ''
                           },
                           computed: dataService.computeAssessment({
                               textGeneration: 3, contentOrganization: 3, workEfficiency: 3, processOptimization: 3, analysis: 4, decisionSupport: 4, ideaGeneration: 4, professionalApplication: 4, structureDesign: 3, botConstruction: 2
                           })
                        });
                     }
                     setMsg('已產出測試評核紀錄，可用主管(如:lee@test.com)視角登入查看');
                  } else {
                     setMsg('請先導入資料再產出測試評核');
                  }
                }}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-md text-sm font-medium shadow-sm hover:bg-indigo-100 border border-indigo-200"
              >
                自動產生測試評核
              </button>
              {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">目前員工名單 ({users.length})</h3>
            <div className="overflow-y-auto flex-1 max-h-64 border rounded-md">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">姓名</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">Email</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">部門</th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">主管 (姓名 / Email)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
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
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
          {/* Left: Team List */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
               <h3 className="font-semibold text-slate-800">全體員工列表</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1 bg-slate-50">
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
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedUser?.email === u.email 
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' 
                        : 'bg-white border-transparent hover:border-slate-300 shadow-sm'
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
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[700px] overflow-y-auto">
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
                        <div className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-200 h-64 overflow-y-auto space-y-3">
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
    </div>
  );
}
