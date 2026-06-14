'use client';

import { useState } from 'react';
import { generateCalendarDays } from '@/lib/utils';

// テスト用の日別平均感情スコア（本来はSupabaseの daily_mood_averages ビューから取得）
const DUMMY_DAILY_AVERAGES: Record<string, number> = {
  '2026-06-01': 3.0,  // 悪い
  '2026-06-02': 4.5,  // 普通
  '2026-06-05': 8.2,  // 良い
  '2026-06-10': 1.5,  // 非常に悪い
  '2026-06-14': 6.0,  // 普通
};

const DUMMY_MEDICATIONS = [
  { id: 'med-1', name: 'レクサプロ', default_amount: 1.0 },
  { id: 'med-2', name: '頓服', default_amount: 1.0 },
  { id: 'med-3', name: 'ビタミンB', default_amount: 1.0 },
];

export default function Home() {
  // カレンダー表示用の年月ステート（現在日時：2026年6月を初期値に設定）
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6);

  // ダイアログおよび入力用のステート
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);

  // カレンダーマスの生成
  const calendarDays = generateCalendarDays(currentYear, currentMonth);

  // 前月・翌月への切り替え処理
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // スコアに応じたカレンダーマスの背景色定義（要件定義準拠）
  const getCalendarTileColor = (score: number | undefined, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return 'bg-gray-50 text-gray-300 border-transparent'; // 先月・翌月の日付
    if (score === undefined) return 'bg-white text-gray-800 border-gray-100'; // 記録なし
    
    if (score <= 3) return 'bg-slate-700 text-white font-bold border-slate-800'; // 1〜3: 黒に近いグレー
    if (score <= 6) return 'bg-amber-500 text-black font-bold border-amber-600'; // 4〜6: 中間色
    return 'bg-emerald-500 text-white font-bold border-emerald-600'; // 7〜10: 明るいグリーン
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'bg-slate-700 text-white';
    if (score <= 6) return 'bg-amber-500 text-black';
    return 'bg-emerald-500 text-white';
  };

  return (
    <main className="relative min-h-screen bg-gray-50 pb-24 font-sans selection:bg-emerald-100">
      {/* ヘッダー */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">感情日記</h1>
        <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">F-05: Calendar</span>
      </header>

      <div className="p-4 max-w-md mx-auto">
        {/* 月間カレンダーコントローラー (BR-02) */}
        <div className="mb-4 flex items-center justify-between bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
          <button 
            onClick={handlePrevMonth} 
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95"
            aria-label="前月へ"
          >
            {/* 左矢印 SVG アイコン */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          
          <h2 className="text-base font-bold text-gray-800 tracking-wide">{currentYear}年 {currentMonth}月</h2>
          
          <button 
            onClick={handleNextMonth} 
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95"
            aria-label="翌月へ"
          >
            {/* 右矢印 SVG アイコン */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400 mb-2">
          {['日', '月', '火', '密', '木', '金', '土'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* カレンダーグリッド本体 (42マス) */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const score = DUMMY_DAILY_AVERAGES[day.dateString];
            return (
              <button
                key={index}
                disabled={!day.isCurrentMonth}
                className={`aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 text-xs border transition-all ${
                  day.isCurrentMonth ? 'active:scale-95 shadow-sm' : ''
                } ${getCalendarTileColor(score, day.isCurrentMonth)}`}
              >
                <span className="self-start text-[11px] font-medium">{day.date.getDate()}</span>
                {day.isCurrentMonth && score !== undefined && (
                  <span className="text-[10px] font-bold tracking-tighter opacity-95 mb-0.5">{score}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* フローティング「＋」ボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg active:scale-95 transition-transform z-40"
      >
        ＋
      </button>

      {/* 瞬間入力ダイアログ */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="w-full rounded-t-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto max-w-md mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">いまの気分は？</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 p-1">キャンセル</button>
            </div>

            {/* 感情スコア */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">感情スコア（必須）</label>
              <div className="grid grid-cols-5 gap-2">
                {[...Array(10)].map((_, i) => {
                  const score = i + 1;
                  return (
                    <button
                      key={score}
                      onClick={() => setSelectedScore(score)}
                      className={`h-11 rounded-xl font-bold transition-all ${
                        selectedScore === score ? `${getScoreColor(score)} ring-4 ring-offset-2 ring-emerald-600 scale-105` : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 服薬 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">服薬チェック（任意）</label>
              <div className="flex flex-wrap gap-2">
                {DUMMY_MEDICATIONS.map((med) => (
                  <button
                    key={med.id}
                    onClick={() =>
                      setSelectedMedIds((prev) =>
                        prev.includes(med.id) ? prev.filter((id) => id !== med.id) : [...prev, med.id]
                      )
                    }
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedMedIds.includes(med.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {med.name}
                  </button>
                ))}
              </div>
            </div>

            {/* メモ */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">メモ（任意）</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={500}
                placeholder="気分のきっかけや出来事など"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-emerald-600 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            <button
              onClick={() => {
                alert('保存処理（次回Supabaseと結合予定）');
                setIsOpen(false);
              }}
              className="w-full py-3.5 rounded-xl bg-green-600 font-bold text-white shadow-md"
            >
              保存する
            </button>
          </div>
        </div>
      )}
    </main>
  );
}