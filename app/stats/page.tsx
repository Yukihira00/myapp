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

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const getInitialDateTimeString = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

function formatLocalIso(date: Date, includeTime = true): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return includeTime ? `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}+09:00` : `${yyyy}-${mm}-${dd}`;
}

function alignSegmentStart(date: Date, mode: RangeMode): Date {
  const aligned = new Date(date);
  aligned.setSeconds(0);
  aligned.setMilliseconds(0);

  if (mode === 'day') {
    const hour = aligned.getHours();
    aligned.setHours(hour < 12 ? 0 : 12, 0, 0, 0);
    return aligned;
  }

  if (mode === 'week') {
    aligned.setHours(0, 0, 0, 0);
    aligned.setDate(aligned.getDate() - aligned.getDay());
    return aligned;
  }

  if (mode === 'month') {
    aligned.setHours(0, 0, 0, 0);
    aligned.setDate(1);
    return aligned;
  }

  aligned.setHours(0, 0, 0, 0);
  aligned.setMonth(0, 1);
  return aligned;
}

function shiftSegmentStart(date: Date, mode: RangeMode, delta: number): Date {
  const next = new Date(date);
  if (mode === 'day') {
    next.setHours(next.getHours() + delta * 12);
    return next;
  }
  if (mode === 'week') {
    next.setDate(next.getDate() + delta * 7);
    return next;
  }
  if (mode === 'month') {
    next.setMonth(next.getMonth() + delta);
    return next;
  }
  next.setFullYear(next.getFullYear() + delta);
  return next;
}

function clampSegmentStart(date: Date, mode: RangeMode): Date {
  const latest = alignSegmentStart(new Date(), mode);
  const earliest = new Date(latest);
  if (mode === 'day') {
    earliest.setDate(earliest.getDate() - 365);
  } else {
    earliest.setFullYear(earliest.getFullYear() - 1);
  }
  if (date < earliest) return earliest;
  if (date > latest) return latest;
  return date;
}

function getBucketKey(date: Date, mode: RangeMode): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  if (mode === 'day') return `${yyyy}-${mm}-${dd}T${hh}:00:00`;
  if (mode === 'year') return `${yyyy}-${mm}`;
  return `${yyyy}-${mm}-${dd}`;
}

function getRangeText(mode: RangeMode, startDate: Date): string {
  if (mode === 'day') {
    const label = startDate.getHours() < 12 ? '午前' : '午後';
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月${startDate.getDate()}日 ${label}`;
  }
  if (mode === 'week') {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 6);
    return `${formatLocalIso(startDate, false).replace(/-/g, '/')}〜${formatLocalIso(end, false).replace(/-/g, '/')}`;
  }
  if (mode === 'month') {
    return `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;
  }
  return `${startDate.getFullYear()}年`;
}

function buildEmptyBuckets(mode: RangeMode, startDate: Date): StatDataPoint[] {
  if (mode === 'day') {
    return Array.from({ length: 12 }).map((_, idx) => {
      const bucketDate = new Date(startDate);
      bucketDate.setHours(startDate.getHours() + idx, 0, 0, 0);
      const label = `${bucketDate.getHours()}時`;
      return {
        dateStr: getBucketKey(bucketDate, 'day'),
        displayLabel: label,
        avgScore: null,
        medCount: 0,
      };
    });
  }
  if (mode === 'week') {
    return Array.from({ length: 7 }).map((_, idx) => {
      const bucketDate = new Date(startDate);
      bucketDate.setDate(startDate.getDate() + idx);
      return {
        dateStr: getBucketKey(bucketDate, 'week'),
        displayLabel: DAY_LABELS[bucketDate.getDay()],
        avgScore: null,
        medCount: 0,
      };
    });
  }
  if (mode === 'month') {
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }).map((_, idx) => {
      const bucketDate = new Date(year, month, idx + 1, 0, 0, 0, 0);
      return {
        dateStr: getBucketKey(bucketDate, 'month'),
        displayLabel: `${idx + 1}`,
        avgScore: null,
        medCount: 0,
      };
    });
  }
  return Array.from({ length: 12 }).map((_, idx) => {
    const bucketDate = new Date(startDate.getFullYear(), idx, 1, 0, 0, 0, 0);
    return {
      dateStr: getBucketKey(bucketDate, 'year'),
      displayLabel: `${bucketDate.getMonth() + 1}月`,
      avgScore: null,
      medCount: 0,
    };
  });
}

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

  const [currentSegmentStart, setCurrentSegmentStart] = useState<Date>(() => alignSegmentStart(new Date(), 'month'));

  const handleNavigateSegment = (delta: number) => {
    setCurrentSegmentStart((prev) => clampSegmentStart(shiftSegmentStart(prev, rangeMode, delta), rangeMode));
  };

  useEffect(() => {
    if (!session) return;

    async function fetchSegmentStats() {
      const currentSession = session;
      if (!currentSession) return;

      setIsLoadingData(true);
      const mode = rangeMode;
      const startDate = currentSegmentStart;
      const endDate = new Date(startDate);

      if (mode === 'day') {
        endDate.setHours(endDate.getHours() + 11, 59, 59, 999);
      } else if (mode === 'week') {
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (mode === 'month') {
        endDate.setMonth(endDate.getMonth() + 1, 0);
        endDate.setHours(23, 59, 59, 999);
      } else {
        endDate.setFullYear(endDate.getFullYear() + 1, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      }

      const startIso = formatLocalIso(startDate, true);
      const endIso = formatLocalIso(endDate, true);
      const rangeText = getRangeText(mode, startDate);

      try {
        const userId = currentSession.user.id;

        const { data: moodData } = await supabase
          .from('mood_logs')
          .select('created_at, score')
          .eq('user_id', userId)
          .gte('created_at', startIso)
          .lte('created_at', endIso);

        const { data: medData } = await supabase
          .from('medication_logs')
          .select('logged_at')
          .eq('user_id', userId)
          .gte('logged_at', startIso)
          .lte('logged_at', endIso);

        const buckets = buildEmptyBuckets(mode, startDate);
        const moodSummary = new Map<string, { sum: number; count: number }>();
        const medSummary = new Map<string, number>();

        (moodData || []).forEach((record) => {
          if (!record?.created_at || typeof record.score !== 'number') return;
          const recordKey = getBucketKey(new Date(record.created_at), mode);
          const current = moodSummary.get(recordKey) ?? { sum: 0, count: 0 };
          current.sum += record.score;
          current.count += 1;
          moodSummary.set(recordKey, current);
        });

        (medData || []).forEach((record) => {
          if (!record?.logged_at) return;
          const recordKey = getBucketKey(new Date(record.logged_at), mode);
          medSummary.set(recordKey, (medSummary.get(recordKey) ?? 0) + 1);
        });

        const computedStats = buckets.map((bucket) => {
          const mood = moodSummary.get(bucket.dateStr);
          const avgScore = mood ? Math.round((mood.sum / mood.count) * 10) / 10 : null;
          return { ...bucket, avgScore, medCount: medSummary.get(bucket.dateStr) ?? 0 };
        });
        setStatsData(computedStats);
        setDisplayRangeText(rangeText);
      } catch (error: unknown) {
        console.error(error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchSegmentStats();
  }, [rangeMode, currentSegmentStart, session, isSubmitting]);

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

// データ集計・5段階の割合計算
  const filteredScores = statsData.filter(d => d.avgScore !== null).map(d => d.avgScore as number);
  const avgAll = filteredScores.length ? filteredScores.reduce((a, b) => a + b, 0) / filteredScores.length : 0;
  
  const veryGoodCount = filteredScores.filter(s => s >= 9).length;
  const goodCount     = filteredScores.filter(s => s >= 7 && s < 9).length;
  const normalCount   = filteredScores.filter(s => s >= 5 && s < 7).length;
  const badCount      = filteredScores.filter(s => s >= 3 && s < 5).length;
  const veryBadCount  = filteredScores.filter(s => s < 3).length;

  const total = filteredScores.length;

  const veryGoodPct = total > 0 ? Math.round((veryGoodCount / total) * 100) : 0;
  const goodPct     = total > 0 ? Math.round((goodCount / total) * 100) : 0;
  const normalPct   = total > 0 ? Math.round((normalCount / total) * 100) : 0;
  const badPct      = total > 0 ? Math.round((badCount / total) * 100) : 0;
  const veryBadPct  = total > 0 ? 100 - (veryGoodPct + goodPct + normalPct + badPct) : 0;

  // 要約カード用の「調子が良い日」はスコア7以上の合計とする
  const goodDaysCount = veryGoodCount + goodCount;

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
                    onClick={() => {
                      setRangeMode(mode);
                      setCurrentSegmentStart(alignSegmentStart(new Date(), mode));
                    }}
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
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12, marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => handleNavigateSegment(-1)}
                  style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid #D9D3CA', backgroundColor: '#FFFFFF', color: '#2A2420', fontWeight: 700, cursor: 'pointer' }}
                >
                  前へ
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateSegment(1)}
                  style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid #D9D3CA', backgroundColor: '#FFFFFF', color: '#2A2420', fontWeight: 700, cursor: 'pointer' }}
                >
                  次へ
                </button>
              </div>
              <StatsDistribution 
  veryGoodPct={veryGoodPct}
  goodPct={goodPct}
  normalPct={normalPct}
  badPct={badPct}
  veryBadPct={veryBadPct}
/>
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