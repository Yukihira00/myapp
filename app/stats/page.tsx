'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// 共通パーツのインポート
import NavigationBar from '@/app/components/NavigationBar';
import { FloatingActionButton } from '@/app/components/FloatingActionButton';
import { AddEntryModal } from '@/app/components/AddEntryModal';

// 統計専用子コンポーネント群のインポート
import { StatsSummaryCard } from '@/app/components/stats/StatsSummaryCard';
import { StatsLineChart } from '@/app/components/stats/StatsLineChart';
import { StatsDistribution } from '@/app/components/stats/StatsDistribution';

type RangeMode = 'day' | 'week' | 'month' | 'year';

interface StatDataPoint {
  dateStr: string;
  displayLabel: string;
  avgScore: number | null;
  medCount: number;
}

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface SupabaseCustomError {
  message: string;
}

// SCORE_COLORS and getScoreColor are provided by other pages/components when needed

const getInitialDateTimeString = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function StatsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [rangeMode, setRangeMode] = useState<RangeMode>('month');
  const [statsData, setStatsData] = useState<StatDataPoint[]>([]);
  const [displayRangeText, setDisplayRangeText] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // モーダル記録用ステート
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [logDateTime, setLogDateTime] = useState('');
  const [medicationMaster, setMedicationMaster] = useState<MedicationMaster[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!session) return;
    async function fetchMedications() {
      const { data, error } = await supabase.from('medications').select('id, name, default_amount');
      if (!error && data) setMedicationMaster(data as MedicationMaster[]);
    }
    fetchMedications();
  }, [session]);

  const generateDateRangeBuckets = (days: number): StatDataPoint[] => {
    const buckets: StatDataPoint[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      buckets.push({
        dateStr: `${d.getFullYear()}-${mm}-${dd}`,
        displayLabel: `${d.getMonth() + 1}/${dd}`,
        avgScore: null,
        medCount: 0,
      });
    }
    return buckets;
  };

  useEffect(() => {
    if (!session) return;

    async function fetchAndAggregateStats() {
      setIsLoadingData(true);
      const now = new Date();
      let computedStats: StatDataPoint[] = [];
      let startIso = '';
      let rangeText = '';

      try {
        if (rangeMode === 'day') {
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const todayStr = `${yyyy}-${mm}-${dd}`;
          startIso = `${todayStr}T00:00:00+09:00`;
          const endIso = `${todayStr}T23:59:59+09:00`;
          rangeText = `表示範囲: ${yyyy}年${mm}月${dd}日 (今日)`;

          const { data: moodData } = await supabase.from('mood_logs').select('created_at, score').gte('created_at', startIso).lte('created_at', endIso);
          const { data: medData } = await supabase.from('medication_logs').select('logged_at').gte('logged_at', startIso).lte('logged_at', endIso);

          for (let h = 0; h < 24; h++) {
            const label = `${String(h).padStart(2, '0')}:00`;
            const hourMoods = (moodData || []).filter(m => new Date(m.created_at).getHours() === h);
            const hourMedsCount = (medData || []).filter(m => new Date(m.logged_at).getHours() === h).length;

            let avgScore: number | null = null;
            if (hourMoods.length > 0) {
              avgScore = Math.round((hourMoods.reduce((acc, cur) => acc + cur.score, 0) / hourMoods.length) * 10) / 10;
            }
            computedStats.push({ dateStr: `${todayStr} ${label}`, displayLabel: label, avgScore, medCount: hourMedsCount });
          }

        } else if (rangeMode === 'week' || rangeMode === 'month') {
          const totalDays = rangeMode === 'week' ? 7 : 30;
          const dateBuckets = generateDateRangeBuckets(totalDays);
          startIso = `${dateBuckets[0].dateStr}T00:00:00+09:00`;
          rangeText = `表示範囲: ${dateBuckets[0].dateStr.replace(/-/g, '/')} 〜 ${dateBuckets[dateBuckets.length - 1].dateStr.replace(/-/g, '/')}`;

          const { data: moodData } = await supabase.from('mood_logs').select('created_at, score').gte('created_at', startIso);
          const { data: medData } = await supabase.from('medication_logs').select('logged_at').gte('logged_at', startIso);

          computedStats = dateBuckets.map((bucket) => {
            const dayMoods = (moodData || []).filter(m => {
              const d = new Date(m.created_at);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === bucket.dateStr;
            });
            const dayMedsCount = (medData || []).filter(m => {
              const d = new Date(m.logged_at);
              return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` === bucket.dateStr;
            }).length;

            let avgScore: number | null = null;
            if (dayMoods.length > 0) {
              avgScore = Math.round((dayMoods.reduce((acc, cur) => acc + cur.score, 0) / dayMoods.length) * 10) / 10;
            }
            return { ...bucket, avgScore, medCount: dayMedsCount };
          });

        } else if (rangeMode === 'year') {
          const buckets: StatDataPoint[] = [];
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({ dateStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, displayLabel: `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`, avgScore: null, medCount: 0 });
          }
          startIso = `${buckets[0].dateStr}-01T00:00:00+09:00`;
          rangeText = `表示範囲: ${buckets[0].displayLabel} 〜 ${buckets[buckets.length - 1].displayLabel}`;

          const { data: moodData } = await supabase.from('mood_logs').select('created_at, score').gte('created_at', startIso);
          const { data: medData } = await supabase.from('medication_logs').select('logged_at').gte('logged_at', startIso);

          computedStats = buckets.map((bucket) => {
            const monthMoods = (moodData || []).filter(m => `${new Date(m.created_at).getFullYear()}-${String(new Date(m.created_at).getMonth() + 1).padStart(2, '0')}` === bucket.dateStr);
            const monthMedsCount = (medData || []).filter(m => `${new Date(m.logged_at).getFullYear()}-${String(new Date(m.logged_at).getMonth() + 1).padStart(2, '0')}` === bucket.dateStr).length;

            let avgScore: number | null = null;
            if (monthMoods.length > 0) {
              avgScore = Math.round((monthMoods.reduce((acc, cur) => acc + cur.score, 0) / monthMoods.length) * 10) / 10;
            }
            return { ...bucket, avgScore, medCount: monthMedsCount };
          });
        }

        setStatsData(computedStats);
        setDisplayRangeText(rangeText);
      } catch (error: unknown) {
        console.error(error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchAndAggregateStats();
  }, [rangeMode, session, isSubmitting]);

  const handleSubmit = async () => {
    if (!selectedScore) return alert('スコアを選択してください');
    if (!session) return;
    setIsSubmitting(true);
    try {
      const now = new Date();
      const targetDate = new Date(`${logDateTime}:00+09:00`);
      targetDate.setSeconds(now.getSeconds()); targetDate.setMilliseconds(now.getMilliseconds());

      if (targetDate > now) {
        alert('エラー：未来の日時指定はできません。');
        setIsSubmitting(false); return;
      }

      const targetIsoString = targetDate.toISOString();
      const currentUserId = session.user.id;

      const { error: moodError } = await supabase.from('mood_logs').insert([{ user_id: currentUserId, score: selectedScore, memo: memo || null, created_at: targetIsoString }]);
      if (moodError) throw moodError;

      if (selectedMedIds.length > 0) {
        const medInserts = selectedMedIds.map((medId) => ({
          user_id: currentUserId, medication_id: medId,
          amount: medicationMaster.find((m) => m.id === medId)?.default_amount || 1.0,
          logged_at: targetIsoString
        }));
        const { error: medError } = await supabase.from('medication_logs').insert(medInserts);
        if (medError) throw medError;
      }

      alert('データを同期しました！');
      setSelectedScore(null); setMemo(''); setSelectedMedIds([]); setIsOpen(false);
    } catch (error: unknown) {
      alert(`同期失敗: ${(error as SupabaseCustomError).message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleOpenDialog = () => {
    setLogDateTime(getInitialDateTimeString());
    setIsOpen(true);
  };

  if (loadingAuth) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8A8278' }}>認証確認中...</div>;
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 14, color: '#5A5450', marginBottom: 16 }}>統計情報を見るにはログインが必要です。</p>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: '#7CB88A', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }}>ログイン画面へ</button>
      </div>
    );
  }

  const filteredScores = statsData.filter(d => d.avgScore !== null).map(d => d.avgScore as number);
  const avgAll = filteredScores.length ? filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length : 0;
  const goodDaysCount = filteredScores.filter(s => s >= 7).length;
  const medium = filteredScores.filter(s => s >= 4 && s < 7).length;
  const total = filteredScores.length || 1;
  const goodPct = Math.round((goodDaysCount / total) * 100);
  const medPct = Math.round((medium / total) * 100);
  const badPct = 100 - goodPct - medPct;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', justifyContent: 'center', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ flexShrink: 0, padding: '16px 20px 4px', display: 'flex', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2420', margin: 0 }}>統計レポート</h1>
        </div>

        <div className="overflow-y-auto flex-1 pb-4" style={{ scrollbarWidth: 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
          
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', backgroundColor: '#EDE8E0', borderRadius: 999, padding: 4, gap: 2 }}>
              {(['day', 'week', 'month', 'year'] as const).map((mode) => {
                const labels = { day: '日', week: '週', month: '月', year: '年' };
                return (
                  <button
                    key={mode}
                    onClick={() => setRangeMode(mode)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 0.2s', fontWeight: 700, fontSize: 13,
                      backgroundColor: rangeMode === mode ? '#7CB88A' : 'transparent',
                      color: rangeMode === mode ? '#FFFFFF' : '#6B6060' }}
                  >
                    {labels[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#8A8278', backgroundColor: '#F0EBE3', padding: '4px 14px', borderRadius: 999 }}>
              {displayRangeText}
            </span>
          </div>

          {isLoadingData ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#8A8278' }}>データを分析中...</div>
          ) : (
            <>
              <StatsSummaryCard avgAll={avgAll} totalEntries={filteredScores.length} goodDaysCount={goodDaysCount} />
              <StatsLineChart statsData={statsData} rangeMode={rangeMode} />
              <StatsDistribution goodPct={goodPct} medPct={medPct} badPct={badPct} />
            </>
          )}
        </div>

        {/* 共通パーツ化されたプラスボタン */}
        <FloatingActionButton onClick={handleOpenDialog} />

        {/* 記録追加モーダル */}
        {isOpen && (
          <AddEntryModal 
            onClose={() => setIsOpen(false)} logDateTime={logDateTime} onLogDateTimeChange={setLogDateTime}
            selectedScore={selectedScore} onSelectScore={setSelectedScore} medicationMaster={medicationMaster}
            selectedMedIds={selectedMedIds} onToggleMedId={(id) => setSelectedMedIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])}
            memo={memo} onMemoChange={setMemo} onSubmit={handleSubmit} isSubmitting={isSubmitting}
          />
        )}

        <NavigationBar />
      </div>
    </div>
  );
}