'use client';

import { useState } from 'react';
import { generateCalendarDays, formatDate } from '@/lib/utils';

// ① テスト用の日別平均感情スコア（カレンダーの色分け用）
const DUMMY_DAILY_AVERAGES: Record<string, number> = {
  '2026-06-01': 3.0,
  '2026-06-02': 4.5,
  '2026-06-05': 8.2,
  '2026-06-10': 1.5,
  '2026-06-14': 6.0,
};

// ② F-06: タイムライン用の詳細ダミーデータ（時間降順）
const DUMMY_TIMELINE_DATA: Record<string, Array<{
  id: string;
  time: string;
  score: number;
  meds: string[];
  memo: string | null;
}>> = {
  '2026-06-14': [
    { id: 'log-1', time: '16:30', score: 6, meds: ['ビタミンB (1.0錠)'], memo: '夕方になり、徐々に気持ちがフラットに戻ってきた感覚がある。' },
    { id: 'log-2', time: '12:15', score: 4, meds: ['レクサプロ (1.0錠)'], memo: '昼食後に少し焦燥感あり。服薬して様子を見る。' },
    { id: 'log-3', time: '08:45', score: 2, meds: ['頓服 (1.0錠)'], memo: '起床時の気分の落ち込みが激しい。動くのが億劫だった。' },
  ],
  '2026-06-05': [
    { id: 'log-4', time: '21:00', score: 9, meds: [], memo: '開発タスクが想定以上にスムーズに進み、非常に充実した達成感。' },
    { id: 'log-5', time: '10:00', score: 7, meds: ['ビタミンB (1.0錠)'], memo: '朝の散歩が心地よく、ポジティブな思考を保てている。' },
  ],
  '2026-06-01': [
    { id: 'log-6', time: '15:00', score: 3, meds: ['頓服 (1.0錠)'], memo: '打ち合わせ前に急な強い不安感に襲われたため頓服を服用。' },
  ]
};

const DUMMY_MEDICATIONS = [
  { id: 'med-1', name: 'レクサプロ', default_amount: 1.0 },
  { id: 'med-2', name: '頓服', default_amount: 1.0 },
  { id: 'med-3', name: 'ビタミンB', default_amount: 1.0 },
];

export default function Home() {
  // カレンダー表示用の年月ステート
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6);
  
  // F-06: 選択された日付を管理するステート（初期値は2026年6月14日）
  const [selectedDateStr, setSelectedDateStr] = useState('2026-06-14');

  // ダイアログおよび入力用のステート
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);

  const calendarDays = generateCalendarDays(currentYear, currentMonth);

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

  // スコアに応じたカレンダーマスの背景色定義
  const getCalendarTileColor = (score: number | undefined, isCurrentMonth: boolean, dateString: string) => {
    const isSelected = dateString === selectedDateStr;
    const baseBorder = isSelected ? 'border-blue-600 ring-2 ring-blue-600/30' : 'border-gray-100';

    if (!isCurrentMonth) return 'bg-gray-50 text-gray-300 border-transparent';
    if (score === undefined) return `bg-white text-gray-800 ${baseBorder}`;
    
    if (score <= 3) return `bg-slate-700 text-white font-bold ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-800'}`;
    if (score <= 6) return `bg-amber-500 text-black font-bold ${isSelected ? 'border-blue-600 ring-2 ring-blue-600/50' : 'border-amber-600'}`;
    return `bg-emerald-500 text-white font-bold ${isSelected ? 'border-blue-400 ring-2 ring-blue-400/50' : 'border-emerald-600'}`;
  };

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'bg-slate-700 text-white';
    if (score <= 6) return 'bg-amber-500 text-black';
    return 'bg-emerald-500 text-white';
  };

  // タイムライン上の簡易バッジ用色定義
  const getTimelineBadgeColor = (score: number) => {
    if (score <= 3) return 'bg-slate-100 text-slate-800 border-slate-300';
    if (score <= 6) return 'bg-amber-100 text-amber-900 border-amber-300';
    return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  };

  // 選択された日の詳細ログリストを取得
  const currentTimelineLogs = DUMMY_TIMELINE_DATA[selectedDateStr] || [];

  return (
    <main className="relative min-h-screen bg-gray-50 pb-28 font-sans antialiased">
      {/* ヘッダー */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-800">感情日記</h1>
        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-md">F-06: Timeline</span>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* 月間カレンダーコントローラー */}
        <div className="flex items-center justify-between bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
          <button onClick={handlePrevMonth} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95" aria-label="前月へ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-800 tracking-wide">{currentYear}年 {currentMonth}月</h2>
          <button onClick={handleNextMonth} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95" aria-label="翌月へ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
          {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
            <div key={d} className="py-1">{d}</div>
          ))}
        </div>

        {/* カレンダーグリッド本体 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const score = DUMMY_DAILY_AVERAGES[day.dateString];
            return (
              <button
                key={index}
                disabled={!day.isCurrentMonth}
                onClick={() => setSelectedDateStr(day.dateString)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 text-xs border transition-all ${
                  day.isCurrentMonth ? 'active:scale-95 shadow-sm' : 'opacity-40'
                } ${getCalendarTileColor(score, day.isCurrentMonth, day.dateString)}`}
              >
                <span className="self-start text-[11px] font-medium">{day.date.getDate()}</span>
                {day.isCurrentMonth && score !== undefined && (
                  <span className="text-[10px] font-bold tracking-tighter opacity-95 mb-0.5">{score}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ③ F-06: タイムライン表示エリア (詳細履歴表示) */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-gray-700">
              {selectedDateStr.split('-')[1]}月{selectedDateStr.split('-')[2]}日の詳細ログ
            </h3>
            <span className="text-xs text-gray-400 font-medium">{currentTimelineLogs.length} 件の記録</span>
          </div>

          {currentTimelineLogs.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400 border border-gray-100 shadow-sm">
              この日のライフログはありません。
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3.5 pl-5 space-y-4">
              {currentTimelineLogs.map((log) => (
                <div key={log.id} className="relative bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 space-y-2">
                  {/* タイムラインの左側に配置される丸い目印 */}
                  <div className={`absolute -left-[27px] top-[18px] h-3 w-3 rounded-full border-2 border-white ring-4 ${
                    log.score <= 3 ? 'bg-slate-600 ring-slate-100' : log.score <= 6 ? 'bg-amber-500 ring-amber-100' : 'bg-emerald-500 ring-emerald-100'
                  }`} />
                  
                  {/* ログカードの上部ヘッダー（時刻とスコア） */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800 font-mono">{log.time}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${getTimelineBadgeColor(log.score)}`}>
                      スコア: {log.score}
                    </span>
                  </div>

                  {/* 服用した薬の情報がある場合の表示 */}
                  {log.meds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">服薬</span>
                      {log.meds.map((m, idx) => (
                        <span key={idx} className="text-xs text-gray-600 font-medium">{m}</span>
                      ))}
                    </div>
                  )}

                  {/* メモ内容の表示 */}
                  {log.memo && (
                    <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap pt-0.5">
                      {log.memo}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* フローティング「＋」ボタン */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-3xl text-white shadow-lg active:scale-95 transition-transform z-40 shadow-emerald-600/20"
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
              className="w-full py-3.5 rounded-xl bg-emerald-600 font-bold text-white shadow-md active:bg-emerald-700 transition-colors"
            >
              保存する
            </button>
          </div>
        </div>
      )}
    </main>
  );
}