'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { generateCalendarDays, formatDate } from '@/lib/utils';

// ※テスト開発用の暫定UUID（Supabaseのprofilesテーブルに存在する有効なUUIDに置き換えてください）
// 本来はSupabase AuthのログインユーザーID（auth.uid()）が自動適用されます
const TEST_USER_ID = '8c2b2284-76e2-44a9-bef4-db3ab49c75f3'; 

interface TimelineLog {
  id: string;
  time: string;
  score: number;
  meds: string[];
  memo: string | null;
}

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface MoodLog {
  id: string;
  created_at: string;
  score: number;
  memo: string | null;
}

interface MedicationLog {
  id: string;
  logged_at: string;
  amount: number;
  medication_id: string;
  medications: {
    name: string;
  };
}

export default function Home() {
  // カレンダー表示用の年月ステート
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(6);
  const [selectedDateStr, setSelectedDateStr] = useState(formatDate(new Date()));

  // データベースから取得した実データを管理するステート
  const [dailyAverages, setDailyAverages] = useState<Record<string, number>>({});
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([]);
  const [medicationMaster, setMedicationMaster] = useState<MedicationMaster[]>([]);

  // ダイアログおよび入力用のステート
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. 初期ロード時：常備薬マスター（medications）の取得
  useEffect(() => {
    async function fetchMedications() {
      const { data, error } = await supabase
        .from('medications')
        .select('id, name, default_amount');
      if (!error && data) {
        setMedicationMaster(data);
      }
    }
    fetchMedications();
  }, []);

  // 2. カレンダー表示月変更時：1日平均感情スコア（ビュー）の取得
  useEffect(() => {
    async function fetchDailyAverages() {
      const startStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const endEndDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`; // 簡易的な月内範囲指定

      const { data, error } = await supabase
        .from('daily_mood_averages')
        .select('log_date, average_score')
        .gte('log_date', startStartDate)
        .lte('log_date', endEndDate);

      if (!error && data) {
        const averagesMap: Record<string, number> = {};
        data.forEach((row: any) => {
          averagesMap[row.log_date] = row.average_score;
        });
        setDailyAverages(averagesMap);
      }
    }
    fetchDailyAverages();
  }, [currentYear, currentMonth]);

  // 3. 選択日付変更時：その日の詳細タイムラインログの取得
  useEffect(() => {
    async function fetchTimelineData() {
      // 感情ログの取得
      const { data: moodData, error: moodError } = await supabase
        .from('mood_logs')
        .select('id, created_at, score, memo')
        .gte('created_at', `${selectedDateStr}T00:00:00Z`)
        .lte('created_at', `${selectedDateStr}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (moodError || !moodData) return;

      // 服薬ログの取得（リレーションを利用して薬の名前も同時に取得）
      const { data: medData, error: medError } = await supabase
        .from('medication_logs')
        .select('id, logged_at, amount, medication_id, medications(name)')
        .gte('logged_at', `${selectedDateStr}T00:00:00Z`)
        .lte('logged_at', `${selectedDateStr}T23:59:59Z`);

      // 感情ログと服薬ログを「時間（分）」を基準にマッピングして整形
      const formattedLogs: TimelineLog[] = moodData.map((mood: any) => {
        const timeStr = new Date(mood.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        // 同じ日に服用した薬をフィルタリング
        const matchedMeds = medData
          ? medData
              .filter((m: any) => {
                const mTime = new Date(m.logged_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                return mTime === timeStr; // 同じ時間帯の服薬を紐付け
              })
              .map((m: any) => `${m.medications?.name || '不明な薬'} (${m.amount}錠)`)
          : [];

        return {
          id: mood.id,
          time: timeStr,
          score: mood.score,
          meds: matchedMeds,
          memo: mood.memo,
        };
      });

      setTimelineLogs(formattedLogs);
    }
    fetchTimelineData();
  }, [selectedDateStr, isSubmitting]); // 保存完了時にも再フェッチがかかるように依存配列を設定

  // カレンダーマスの生成
  const calendarDays = generateCalendarDays(currentYear, currentMonth);

  // 前月・翌月切り替え
  const handlePrevMonth = () => {
    if (currentMonth === 1) { setCurrentYear(currentYear - 1); setCurrentMonth(12); }
    else { setCurrentMonth(currentMonth - 1); }
  };
  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentYear(currentYear + 1); setCurrentMonth(1); }
    else { setCurrentMonth(currentMonth + 1); }
  };

  // データの保存処理
  const handleSubmit = async () => {
    if (!selectedScore) {
      alert('感情スコアを選択してください');
      return;
    }
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();

      // ① mood_logsテーブルへのインサート
      const { error: moodError } = await supabase
        .from('mood_logs')
        .insert([
          { user_id: TEST_USER_ID, score: selectedScore, memo: memo || null, created_at: nowIso }
        ]);
      if (moodError) throw moodError;

      // ② medication_logsテーブルへのインサート（薬が選択されている場合）
      if (selectedMedIds.length > 0) {
        const medInserts = selectedMedIds.map((medId) => {
          const med = medicationMaster.find((m) => m.id === medId);
          return {
            user_id: TEST_USER_ID,
            medication_id: medId,
            amount: med ? med.default_amount : 1.0,
            logged_at: nowIso
          };
        });

        const { error: medError } = await supabase
          .from('medication_logs')
          .insert(medInserts);
        if (medError) throw medError;
      }

      alert('データを安全に同期しました。');
      setSelectedScore(null);
      setMemo('');
      setSelectedMedIds([]);
      setIsOpen(false);

    } catch (error: unknown) {
      console.error('同期エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`同期失敗: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCalendarTileColor = (score: number | undefined, isCurrentMonth: boolean, dateString: string) => {
    const isSelected = dateString === selectedDateStr;
    const baseBorder = isSelected ? 'border-blue-600 ring-2 ring-blue-600/30' : 'border-gray-100';
    if (!isCurrentMonth) return 'bg-gray-50 text-gray-300 border-transparent';
    if (score === undefined) return `bg-white text-gray-800 ${baseBorder}`;
    if (score <= 3) return `bg-slate-700 text-white font-bold ${isSelected ? 'border-blue-500 ring-2 border-blue-500/50' : 'border-slate-800'}`;
    if (score <= 6) return `bg-amber-500 text-black font-bold ${isSelected ? 'border-blue-600 ring-2 ring-blue-600/50' : 'border-amber-600'}`;
    return `bg-emerald-500 text-white font-bold ${isSelected ? 'border-blue-400 ring-2 ring-blue-400/50' : 'border-emerald-600'}`;
  };

  return (
    <main className="relative min-h-screen bg-gray-50 pb-28 font-sans antialiased">
      <header className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-800">感情日記</h1>
        <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded-md">DB Integration</span>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* カレンダーコントローラー */}
        <div className="flex items-center justify-between bg-white rounded-xl p-2.5 shadow-sm border border-gray-100">
          <button onClick={handlePrevMonth} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-gray-800 tracking-wide">{currentYear}年 {currentMonth}月</h2>
          <button onClick={handleNextMonth} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors active:scale-95">
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

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            const score = dailyAverages[day.dateString];
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

        {/* タイムライン詳細表示 */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-gray-700">
              {selectedDateStr.split('-')[1]}月{selectedDateStr.split('-')[2]}日の詳細ログ
            </h3>
            <span className="text-xs text-gray-400 font-medium">{timelineLogs.length} 件の記録</span>
          </div>

          {timelineLogs.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400 border border-gray-100 shadow-sm">
              この日のライフログはありません。
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-3.5 pl-5 space-y-4">
              {timelineLogs.map((log) => (
                <div key={log.id} className="relative bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 space-y-2">
                  <div className={`absolute -left-[27px] top-[18px] h-3 w-3 rounded-full border-2 border-white ring-4 ${
                    log.score <= 3 ? 'bg-slate-600 ring-slate-100' : log.score <= 6 ? 'bg-amber-500 ring-amber-100' : 'bg-emerald-500 ring-emerald-100'
                  }`} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800 font-mono">{log.time}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${
                      log.score <= 3 ? 'bg-slate-100 text-slate-800 border-slate-300' : log.score <= 6 ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}>
                      スコア: {log.score}
                    </span>
                  </div>
                  {log.meds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">服薬</span>
                      {log.meds.map((m, idx) => <span key={idx} className="text-xs text-gray-600 font-medium">{m}</span>)}
                    </div>
                  )}
                  {log.memo && <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap pt-0.5">{log.memo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* フフローティング「＋」ボタン */}
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
                        selectedScore === score ? `bg-emerald-600 text-white ring-4 ring-offset-2 ring-emerald-600 scale-105` : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 常備薬実データに基づくチェック選択 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">服薬チェック（任意）</label>
              <div className="flex flex-wrap gap-2">
                {medicationMaster.length === 0 ? (
                  <span className="text-xs text-gray-400">登録済みの常備薬はありません。</span>
                ) : (
                  medicationMaster.map((med) => (
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
                  ))
                )}
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-emerald-600 font-bold text-white shadow-md disabled:bg-gray-400"
            >
              {isSubmitting ? '同期中...' : '保存して同期'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}