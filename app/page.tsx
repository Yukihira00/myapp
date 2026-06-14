'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import Link from 'next/link';

// --- 厳密な型定義（Interfaces） ---
interface StatDataPoint {
  dateStr: string;     // YYYY-MM-DD
  displayLabel: string; // MM/DD
  avgScore: number | null;
  medCount: number;
}

interface DBResponseMood {
  created_at: string;
  score: number;
}

interface DBResponseMed {
  logged_at: string;
}

interface SupabaseCustomError {
  message: string;
}

export default function StatsPage() {
  // 認証用ステート
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // 統計画面用ステート
  const [rangeMode, setRangeMode] = useState<'week' | 'month'>('week'); // 7日間 or 30日間
  const [statsData, setStatsData] = useState<StatDataPoint[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 1. 認証状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. 指定された範囲のダミーの器（日付配列）を日本時間基準で生成する関数
  const generateDateRangeBuckets = (days: number): StatDataPoint[] => {
    const buckets: StatDataPoint[] = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      
      buckets.push({
        dateStr: `${yyyy}-${mm}-${dd}`,
        displayLabel: `${mm}/${dd}`,
        avgScore: null,
        medCount: 0,
      });
    }
    return buckets;
  };

  // 3. 期間変更またはセッション確定時に実データを集計する処理
  useEffect(() => {
    if (!session) return;

    async function fetchAndAggregateStats() {
      setIsLoadingData(true);
      const totalDays = rangeMode === 'week' ? 7 : 30;
      const dateBuckets = generateDateRangeBuckets(totalDays);

      // 検索開始の境界日時（日本時間基準の00:00）
      const startDateStr = dateBuckets[0].dateStr;
      const startIso = `${startDateStr}T00:00:00+09:00`;

      try {
        // ① 感情ログの取得
        const { data: moodData, error: moodError } = await supabase
          .from('mood_logs')
          .select('created_at, score')
          .gte('created_at', startIso)
          .order('created_at', { ascending: true });

        if (moodError) throw moodError;
        const typedMoods = moodData as DBResponseMood[];

        // ② 服薬ログの取得
        const { data: medData, error: medError } = await supabase
          .from('medication_logs')
          .select('logged_at')
          .gte('logged_at', startIso);

        if (medError) throw medError;
        const typedMeds = medData as DBResponseMed[];

        // ③ 日付バケットへのマッピング・集計
        const computedStats = dateBuckets.map((bucket) => {
          // 該当日に該当する感情ログを抽出
          const dayMoods = typedMoods.filter((m) => {
            const localDate = new Date(m.created_at).toLocaleDateString('ja-JP', {
              year: 'numeric', month: '2-digit', day: '2-digit'
            }).replace(/\//g, '-');
            return localDate === bucket.dateStr;
          });

          // 該当日に該当する服薬ログを抽出
          const dayMedsCount = typedMeds.filter((m) => {
            const localDate = new Date(m.logged_at).toLocaleDateString('ja-JP', {
              year: 'numeric', month: '2-digit', day: '2-digit'
            }).replace(/\//g, '-');
            return localDate === bucket.dateStr;
          }).length;

          // 平均感情スコアの計算（小数点第1位まで）
          let avgScore: number | null = null;
          if (dayMoods.length > 0) {
            const sum = dayMoods.reduce((acc, cur) => acc + cur.score, 0);
            avgScore = Math.round((sum / dayMoods.length) * 10) / 10;
          }

          return {
            ...bucket,
            avgScore,
            medCount: dayMedsCount,
          };
        });

        setStatsData(computedStats);
      } catch (error: unknown) {
        let errMsg = 'データの集計に失敗しました。';
        if (error && typeof error === 'object' && 'message' in error) {
          errMsg = (error as SupabaseCustomError).message;
        }
        alert(errMsg);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchAndAggregateStats();
  }, [rangeMode, session]);

  if (loadingAuth) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">認証確認中...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-sm text-gray-600 mb-4">統計情報を見るにはログインが必要です。</p>
        <Link href="/" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">ログイン画面へ</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-12 font-sans antialiased">
      {/* ヘッダーナビゲーション */}
      <header className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 flex items-center sticky top-0 z-30">
        <Link href="/" className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-gray-800">相関分析・統計</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* 期間切り替えセグメントコントローラー */}
        <div className="grid grid-cols-2 gap-1 bg-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setRangeMode('week')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${rangeMode === 'week' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            直近 7 日間
          </button>
          <button
            onClick={() => setRangeMode('month')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${rangeMode === 'month' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            直近 30 日間
          </button>
        </div>

        {/* グラフカード基盤 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">気分と服薬の推移</h2>
            <div className="flex items-center gap-3 text-[10px] font-bold">
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />感情</div>
              <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-400 block" />服薬回数</div>
            </div>
          </div>

          {isLoadingData ? (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400">データを収集中...</div>
          ) : (
            /* CSS Gridによる横スクロール可能なカスタムグラフコンポーネント */
            <div className="w-full overflow-x-auto pt-4 scrollbar-none">
              <div className="flex items-end h-64 border-b border-gray-200 pb-2 space-x-2" style={{ minWidth: rangeMode === 'week' ? '100%' : '640px' }}>
                {statsData.map((data, index) => {
                  // 高さ計算（感情スコアはMAX10なので10倍、服薬はMAX5回想定で20倍にスケール）
                  const scoreHeight = data.avgScore ? `${data.avgScore * 8}%` : '0%';
                  const medHeight = data.medCount ? `${Math.min(data.medCount * 20, 100)}%` : '0%';

                  return (
                    <div key={index} className="flex-1 flex flex-col items-center h-full justify-end relative group">
                      {/* 1. 服薬回数のバー（背面・薄いブルー） */}
                      {data.medCount > 0 && (
                        <div 
                          style={{ height: medHeight }} 
                          className="w-full max-w-[14px] bg-blue-400/40 rounded-t-sm absolute bottom-0 z-10 transition-all group-hover:bg-blue-400/60"
                        />
                      )}

                      {/* 2. 感情スコアのインジケーター（前面・丸ピン） */}
                      {data.avgScore !== null ? (
                        <div 
                          style={{ bottom: scoreHeight }} 
                          className={`w-3 h-3 rounded-full absolute z-20 shadow-sm transition-transform group-hover:scale-125 border border-white ${
                            data.avgScore <= 3 ? 'bg-slate-600' : data.avgScore <= 6 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        >
                          {/* ホバー時に数値をポップアップ表示 */}
                          <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-mono px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                            評: {data.avgScore} / 薬: {data.medCount}回
                          </span>
                        </div>
                      ) : (
                        /* データがない日は極小のドットを配置 */
                        <div className="w-1 h-1 bg-gray-200 rounded-full absolute bottom-1/2" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X軸のラベル（日付） */}
              <div className="flex space-x-2 pt-1.5 text-[9px] font-mono text-gray-400" style={{ minWidth: rangeMode === 'week' ? '100%' : '640px' }}>
                {statsData.map((data, index) => (
                  <div key={index} className="flex-1 text-center truncate">
                    {rangeMode === 'week' ? data.displayLabel : index % 3 === 0 ? data.displayLabel : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 統計概要サマリー情報 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase">期間内最高気分</p>
            <p className="text-xl font-black text-emerald-600 mt-0.5">
              {statsData.filter(d => d.avgScore !== null).length > 0 
                ? `${Math.max(...statsData.map(d => d.avgScore || 0))}` 
                : '--'}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase">総服薬回数</p>
            <p className="text-xl font-black text-blue-500 mt-0.5">
              {statsData.reduce((acc, cur) => acc + cur.medCount, 0)} <span className="text-xs font-normal text-gray-400">回</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}