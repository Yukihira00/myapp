'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Session } from '@supabase/supabase-js';

// 各種共通コンポーネントのインポート
import { Header } from '@/app/components/Header';
import { CalendarView } from '@/app/components/CalendarView';
import { TimelineList } from '@/app/components/TimelineList';
import { AddEntryModal } from '@/app/components/AddEntryModal';
import { FloatingActionButton } from '@/app/components/FloatingActionButton';
import NavigationBar from '@/app/components/NavigationBar';

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

interface DailyMoodAverageRow {
  log_date: string;
  average_score: number;
}

interface MoodLogResponse {
  id: string;
  created_at: string;
  score: number;
  memo: string | null;
}

interface MedicationLogResponse {
  id: string;
  logged_at: string;
  amount: number;
  medication_id: string;
  medications: { name: string } | null;
}

interface SupabaseCustomError {
  message: string;
}

const SCORE_COLORS = [
  { bg: '#1A1A1A', text: '#FFFFFF' }, { bg: '#2E2E2E', text: '#FFFFFF' },
  { bg: '#484848', text: '#FFFFFF' }, { bg: '#6B5840', text: '#FFFFFF' },
  { bg: '#9B8464', text: '#FFFFFF' }, { bg: '#B8A882', text: '#2A2A2A' },
  { bg: '#C8D878', text: '#2A2A2A' }, { bg: '#D8EC96', text: '#2A2A2A' },
  { bg: '#E8F5B0', text: '#2A2A2A' }, { bg: '#F5FAD0', text: '#2A2A2A' },
];

const SCORE_EMOJIS = ['😢', '😞', '😟', '😐', '😶', '🙂', '😊', '😄', '😁', '🤩'];

const getScoreColor = (score: number) =>
  SCORE_COLORS[Math.min(Math.max(Math.round(score), 1), 10) - 1];

const getInitialDateTimeString = (selectedDateStr: string): string => {
  const todayStr = formatDate(new Date());
  if (selectedDateStr === todayStr) {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  } else {
    return `${selectedDateStr}T00:00`;
  }
};

export default function Home(): React.JSX.Element {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(6);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatDate(new Date()));
  const [dailyAverages, setDailyAverages] = useState<Record<string, number>>({});
  const [timelineLogs, setTimelineLogs] = useState<TimelineLog[]>([]);
  const [medicationMaster, setMedicationMaster] = useState<MedicationMaster[]>([]);

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState<string>('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [logDateTime, setLogDateTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => setSession(currentSession));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {            setSession(currentSession);
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

  useEffect(() => {
    if (!session) return;
    async function fetchDailyAverages() {
      const startStartDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endEndDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('daily_mood_averages')
        .select('log_date, average_score')
        .gte('log_date', startStartDate)
        .lte('log_date', endEndDate);

      if (!error && data) {
        const averagesMap: Record<string, number> = {};
        (data as DailyMoodAverageRow[]).forEach((row) => { averagesMap[row.log_date] = row.average_score; });
        setDailyAverages(averagesMap);
      }
    }
    fetchDailyAverages();
  }, [currentYear, currentMonth, session, isSubmitting]);

  useEffect(() => {
    if (!session) return;
    async function fetchTimelineData() {
      const { data: moodData, error: moodError } = await supabase
        .from('mood_logs')
        .select('id, created_at, score, memo')
        .gte('created_at', `${selectedDateStr}T00:00:00+09:00`)
        .lte('created_at', `${selectedDateStr}T23:59:59+09:00`)
        .order('created_at', { ascending: false });

      if (moodError || !moodData) return;

      const { data: medData } = await supabase
        .from('medication_logs')
        .select('id, logged_at, amount, medication_id, medications(name)')
        .gte('logged_at', `${selectedDateStr}T00:00:00+09:00`)
        .lte('logged_at', `${selectedDateStr}T23:59:59+09:00`);

      const typedMedData = medData as MedicationLogResponse[] | null;

      const formattedLogs: TimelineLog[] = (moodData as MoodLogResponse[]).map((mood) => {
        const timeStr = new Date(mood.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        const matchedMeds = typedMedData
          ? typedMedData
              .filter((m) => new Date(m.logged_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) === timeStr)
              .map((m) => `${m.medications?.name || '不明な薬'} (${m.amount}錠)`)
          : [];

        return { id: mood.id, time: timeStr, score: mood.score, meds: matchedMeds, memo: mood.memo };
      });
      setTimelineLogs(formattedLogs);
    }
    fetchTimelineData();
  }, [selectedDateStr, session, isSubmitting]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return alert('入力してください');
    setAuthLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { display_name: authName } } });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (error: unknown) {
      alert(`認証エラー: ${(error as SupabaseCustomError).message}`);
    } finally { setAuthLoading(false); }
  };

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

      alert('同期完了しました');
      setSelectedScore(null); setMemo(''); setSelectedMedIds([]); setIsOpen(false);
    } catch (error: unknown) {
      alert(`同期失敗: ${(error as SupabaseCustomError).message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleOpenDialog = () => {
    setLogDateTime(getInitialDateTimeString(selectedDateStr));
    setIsOpen(true);
  };

  const handlePrevMonth = () => { if (currentMonth === 1) { setCurrentYear(currentYear - 1); setCurrentMonth(12); } else { setCurrentMonth(currentMonth - 1); } };
  const handleNextMonth = () => { if (currentMonth === 12) { setCurrentYear(currentYear + 1); setCurrentMonth(1); } else { setCurrentMonth(currentMonth + 1); } };
  const handleToggleMedId = (id: string) => { setSelectedMedIds((prev) => prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]); };

  if (!session) {
    return (
      <main style={{ minHeight: '100vh', backgroundColor: '#D8D4CE', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: 'Nunito, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 400, backgroundColor: '#FAF7F2', borderRadius: 24, padding: 24, textAlign: 'center' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#2A2420', margin: '0 0 4px' }}>{isSignUp ? 'アカウント作成' : 'ログイン'}</h2>
          <p style={{ fontSize: 12, color: '#8A8278', margin: '0 0 24px' }}>感情と服薬の相関ライフログ</p>
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {isSignUp && (
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 4 }}>お名前</label>
                <input type="text" placeholder="山田 太郎" value={authName} onChange={(e) => setAuthName(e.target.value)} style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', padding: 12, fontSize: 14 }} required />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 4 }}>メールアドレス</label>
              <input type="email" placeholder="example@email.com" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', padding: 12, fontSize: 14 }} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6B5840', marginBottom: 4 }}>パスワード</label>
              <input type="password" placeholder="••••••••" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ width: '100%', borderRadius: 12, border: '1px solid #E5E7EB', padding: 12, fontSize: 14 }} required />
            </div>
            <button type="submit" disabled={authLoading} style={{ width: '100%', padding: '14px 0', borderRadius: 12, backgroundColor: '#7CB88A', border: 'none', color: '#FFFFFF', fontWeight: 'bold', cursor: 'pointer' }}>
              {authLoading ? '処理中...' : isSignUp ? 'アカウントを作成する' : 'ログインする'}
            </button>
          </form>
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: '#7CB88A', cursor: 'pointer', marginTop: 16 }}>
            {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : '初めて利用される方はこちら'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', justifyContent: 'center', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <Header />

        <div className="overflow-y-auto flex-1 pb-4" style={{ scrollbarWidth: 'none', overflowY: 'auto' }}>
          
          <CalendarView 
            currentYear={currentYear} currentMonth={currentMonth} selectedDateStr={selectedDateStr} dailyAverages={dailyAverages}
            onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} onSelectDate={setSelectedDateStr}
            getScoreColor={getScoreColor} formatDate={formatDate}
          />

          <TimelineList 
            selectedDateStr={selectedDateStr} timelineLogs={timelineLogs}
            getScoreColor={getScoreColor} SCORE_EMOJIS={SCORE_EMOJIS}
          />

        </div>

        <FloatingActionButton onClick={handleOpenDialog} />

        {isOpen && (
          <AddEntryModal 
            onClose={() => setIsOpen(false)} logDateTime={logDateTime} onLogDateTimeChange={setLogDateTime}
            selectedScore={selectedScore} onSelectScore={setSelectedScore} medicationMaster={medicationMaster}
            selectedMedIds={selectedMedIds} onToggleMedId={handleToggleMedId} memo={memo} onMemoChange={setMemo}
            onSubmit={handleSubmit} isSubmitting={isSubmitting}
          />
        )}

        <NavigationBar />

      </div>
    </div>
  );
}