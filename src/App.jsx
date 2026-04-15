import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  List, 
  Brain, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  User,
  Clock,
  Activity,
  Pill,
  FileText
} from 'lucide-react';

// APIキーは実行環境から提供されます
const apiKey = "";

// ユーティリティ: 遅延関数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Gemini API呼び出し関数 (エクスポネンシャルバックオフによる再試行付き)
const fetchAIAnalysis = async (records) => {
  const systemInstruction = `
    あなたは医療・福祉・介護事業所のケアマネージャーおよびデータアナリストの専門家AIです。
    提供された事業所の利用者の日々の記録データ（出欠席、服薬、通院、その他の予定）を詳細に分析し、以下の項目についてプロフェッショナルな視点で提案を行ってください。
    1. 【全体傾向の分析】: 記録データから読み取れる全体の傾向やパターンの詳細な分析
    2. 【個別リスクと注意点】: 注意が必要な利用者、服薬状況や通院頻度から考えられる健康上のリスク
    3. 【今後の指針とケア提案】: 施設としての業務改善案、個別のケア方針の修正提案、次にとるべき具体的なアクション
    出力は読みやすいMarkdown形式（見出しや箇条書きを使用）で、専門的かつ実践的な内容にしてください。
  `;

  const prompt = `
    以下の事業所の記録データを分析してください。
    【記録データ(JSON形式)】
    ${JSON.stringify(records, null, 2)}
  `;

  const maxRetries = 5;
  const baseDelay = 1000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: { parts: [{ text: systemInstruction }] }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No valid response from AI');
      }

      return text;
    } catch (err) {
      if (attempt === maxRetries - 1) {
        throw new Error('AIの分析中にエラーが発生しました。時間をおいて再度お試しください。');
      }
      // エクスポネンシャルバックオフ (1s, 2s, 4s, 8s, 16s)
      await delay(baseDelay * Math.pow(2, attempt));
    }
  }
};

const MEDICATION_TIMINGS = [
  '朝食前', '朝食中', '朝食後', 
  '昼食前', '昼食中', '昼食後', 
  '夕食前', '夕食中', '夕食後', 
  '眠前', '頓服'
];

const ATTENDANCE_STATUSES = ['出席', '欠席', '遅刻', '早退'];

const App = () => {
  const [activeTab, setActiveTab] = useState('input');
  const [records, setRecords] = useState([]);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // フォームの初期状態
  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    userName: '',
    attendance: '出席',
    hospitalVisit: false,
    checkup: false,
    medication: MEDICATION_TIMINGS.reduce((acc, timing) => ({ ...acc, [timing]: false }), {}),
    procedure: false,
    otherNotes: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  // メッセージの自動消去
  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  // 入力ハンドラー
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('medication_')) {
      const timing = name.replace('medication_', '');
      setFormData(prev => ({
        ...prev,
        medication: {
          ...prev.medication,
          [timing]: checked
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // 記録の保存
  const handleSaveRecord = (e) => {
    e.preventDefault();
    if (!formData.userName.trim()) {
      setErrorMsg('利用者名を入力してください。');
      return;
    }

    const newRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...formData
    };

    setRecords(prev => [newRecord, ...prev]);
    setFormData({ ...initialFormState, date: formData.date }); // 日付は保持
    setSuccessMsg('記録を保存しました。');
  };

  // AI分析の実行
  const handleAnalyze = async () => {
    if (records.length === 0) {
      setErrorMsg('分析する記録データがありません。先に記録を入力してください。');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg('');
    setAiAnalysisResult('');

    try {
      const result = await fetchAIAnalysis(records);
      setAiAnalysisResult(result);
      setSuccessMsg('AIによる分析と提案が完了しました。');
    } catch (error) {
      setErrorMsg(error.message || '分析処理に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 記録削除
  const handleDeleteRecord = (id) => {
    setRecords(prev => prev.filter(record => record.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-blue-200">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">UMF CareManager Pro</h1>
            <h1 className="text-lg font-bold text-gray-900 sm:hidden">UMF Care</h1>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('input')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">記録入力</span>
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">記録一覧</span>
              {records.length > 0 && (
                <span className="bg-blue-100 text-blue-600 text-xs px-1.5 rounded-full">{records.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors ${
                activeTab === 'analysis' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI分析・提案</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 通知メッセージ */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">{successMsg}</p>
          </div>
        )}

        {/* タブコンテンツ: 記録入力 */}
        {activeTab === 'input' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              日々の記録を入力
            </h2>
            
            <form onSubmit={handleSaveRecord} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 基本情報 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" /> 日付
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" /> 利用者名
                  </label>
                  <input
                    type="text"
                    name="userName"
                    value={formData.userName}
                    onChange={handleInputChange}
                    placeholder="例: 山田 太郎"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* 出欠席状況 */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" /> 出欠席状況
                </label>
                <div className="flex flex-wrap gap-4">
                  {ATTENDANCE_STATUSES.map(status => (
                    <label key={status} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        name="attendance"
                        value={status}
                        checked={formData.attendance === status}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{status}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 特別な予定 */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-gray-400" /> 特別な予定・手続き
                </label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="hospitalVisit"
                      checked={formData.hospitalVisit}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">通院日</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="checkup"
                      checked={formData.checkup}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">検査日</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="procedure"
                      checked={formData.procedure}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">役所手続き</span>
                  </label>
                </div>
              </div>

              {/* 服薬チェック */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-gray-400" /> 服薬確認 (チェックした項目が「服薬あり・確認済」となります)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {MEDICATION_TIMINGS.map(timing => (
                    <label key={timing} className="flex items-center gap-2 cursor-pointer group bg-white p-2 rounded border border-gray-200 shadow-sm hover:border-blue-300 transition-colors">
                      <input
                        type="checkbox"
                        name={`medication_${timing}`}
                        checked={formData.medication[timing]}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{timing}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* その他の予定・備考 */}
              <div className="space-y-2 pt-4 border-t border-gray-100">
                <label className="block text-sm font-medium text-gray-700">その他の予定・詳細備考</label>
                <textarea
                  name="otherNotes"
                  value={formData.otherNotes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  placeholder="具体的な様子、遅刻理由、その他特記事項を入力..."
                ></textarea>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  この記録を保存する
                </button>
              </div>
            </form>
          </div>
        )}

        {/* タブコンテンツ: 記録一覧 */}
        {activeTab === 'list' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <List className="w-5 h-5 text-blue-500" />
                記録データ一覧
              </h2>
              <span className="text-sm text-gray-500">全 {records.length} 件</span>
            </div>
            
            {records.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>記録データがありません。</p>
                <p className="text-sm mt-1">「記録入力」タブからデータを登録してください。</p>
                <button 
                  onClick={() => setActiveTab('input')}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  入力を始める →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-medium">日付</th>
                      <th className="px-4 py-3 font-medium">利用者名</th>
                      <th className="px-4 py-3 font-medium">出欠状況</th>
                      <th className="px-4 py-3 font-medium">特別予定</th>
                      <th className="px-4 py-3 font-medium">服薬確認</th>
                      <th className="px-4 py-3 font-medium">備考・その他</th>
                      <th className="px-4 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {records.map((record) => {
                      // 特別予定のバッジ生成
                      const specialEvents = [];
                      if (record.hospitalVisit) specialEvents.push('通院');
                      if (record.checkup) specialEvents.push('検査');
                      if (record.procedure) specialEvents.push('手続き');

                      // 服薬のサマリー生成
                      const meds = Object.entries(record.medication)
                        .filter(([_, checked]) => checked)
                        .map(([timing]) => timing);

                      return (
                        <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900">{record.date}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{record.userName}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              record.attendance === '出席' ? 'bg-green-100 text-green-800' :
                              record.attendance === '欠席' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {record.attendance}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {specialEvents.length > 0 ? specialEvents.map(ev => (
                                <span key={ev} className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded border border-purple-200">
                                  {ev}
                                </span>
                              )) : <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                             <div className="max-w-[150px] truncate text-xs text-gray-600" title={meds.join(', ')}>
                               {meds.length > 0 ? meds.join(', ') : <span className="text-gray-400">なし</span>}
                             </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-[200px] truncate text-xs text-gray-600" title={record.otherNotes}>
                              {record.otherNotes || <span className="text-gray-400">-</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-500 hover:text-red-700 text-xs font-medium"
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* タブコンテンツ: AI分析・提案 */}
        {activeTab === 'analysis' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  AIによる詳細分析と今後の指針提案
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  蓄積された全記録データを基に、専門家AIが傾向分析や業務改善の提案を行います。
                </p>
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || records.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI分析中...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    分析を実行する
                  </>
                )}
              </button>
            </div>

            <div className="p-6">
              {records.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>分析対象のデータがありません。「記録入力」タブからデータを追加してください。</p>
                </div>
              ) : isAnalyzing ? (
                <div className="py-12 flex flex-col items-center justify-center text-indigo-600 space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin" />
                  <p className="text-sm font-medium animate-pulse">データを読み込み、医療・福祉的観点から解析しています...</p>
                </div>
              ) : aiAnalysisResult ? (
                <div className="prose prose-sm sm:prose-base max-w-none prose-headings:text-indigo-900 prose-a:text-indigo-600">
                  {/* Markdownライクなテキストを簡易的にレンダリング */}
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">
                     {aiAnalysisResult.split('\n').map((line, i) => {
                       if (line.startsWith('##')) return <h3 key={i} className="text-lg font-bold text-indigo-800 mt-6 mb-3 pb-2 border-b border-indigo-100">{line.replace(/##\s*/, '')}</h3>;
                       if (line.startsWith('#')) return <h2 key={i} className="text-xl font-bold text-indigo-900 mt-8 mb-4">{line.replace(/#\s*/, '')}</h2>;
                       if (line.startsWith('* ') || line.startsWith('- ')) return <li key={i} className="ml-4 mb-1 text-gray-700">{line.substring(2)}</li>;
                       if (line.trim() === '') return <div key={i} className="h-4"></div>;
                       return <p key={i} className="mb-2">{line}</p>;
                     })}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                  <Brain className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="font-medium text-gray-700">準備完了</p>
                  <p className="text-sm mt-1">右上のボタンをクリックしてAI分析を開始してください。</p>
                  <p className="text-xs text-gray-400 mt-2">※現在の記録件数: {records.length}件</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
