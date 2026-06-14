'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Session } from '@supabase/supabase-js';

// 共通コンポーネントのインポート
import NavigationBar from '@/app/components/NavigationBar';
import { FloatingActionButton } from '@/app/components/FloatingActionButton';
import { AddEntryModal } from '@/app/components/AddEntryModal';

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface SupabaseCustomError {
  message: string;
}

interface CSVMedicationRelation {
  name: string;
}

interface CSVMedicationLog {
  logged_at: string;
  amount: number;
  medications: CSVMedicationRelation | CSVMedicationRelation[] | null;
}

interface CSVMoodLog {
  created_at: string;
  score: number;
  memo: string | null;
}

export default function SettingsPage(): React.JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  
  const [totalEntriesCount, setTotalEntriesCount] = useState<number>(0);
  const [medicationsCount, setMedicationsCount] = useState<number>(0);
  const [medicationMaster, setMedicationMaster] = useState<MedicationMaster[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);

  // 画面共通FABモーダル用ステート
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState<string>('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [logDateTime, setLogDateTime] = useState<string>('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoadingAuth(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // データの自動取得・手動キャッシュクリア連動Effect（Cascading renders対策）
  useEffect(() => {
    let active = true;
    if (!session) return;
    
    async function fetchSummaryData(): Promise<void> {
      const { count: moodCount } = await supabase.from('mood_logs').select('*', { count: 'exact', head: true });
      const { data: meds, count: medCount } = await supabase.from('medications').select('id, name, default_amount', { count: 'exact' });

      if (!active) return;
      if (moodCount !== null) setTotalEntriesCount(moodCount);
      if (medCount !== null) setMedicationsCount(medCount);
      if (meds) setMedicationMaster(meds as MedicationMaster[]);
    }

    fetchSummaryData();

    return () => {
      active = false;
    };
  }, [session, isSubmitting, refreshTrigger]);

  // 離脱（ログアウト）処理
  const handleSignOut = async (): Promise<void> => {
    if (!confirm('ログアウト（アカウントの離脱）をしますか？\n次回利用時は再度ログインが必要です。')) return;
    try {
      await supabase.auth.signOut();
      setSession(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.assign(window.location.origin);
    } catch (error: unknown) {
      console.error(error);
    }
  };

  // 【新設機能】トリプルガード仕様：ライフログデータの全削除処理
  const handleDeleteAllLogs = async (): Promise<void> => {
    if (!session) return;
    const currentUserId: string = session.user.id;

    // ガード1
    if (!confirm('【警告】これまでに記録したすべての感情ライフログおよび服薬履歴を完全に削除しますか？\nこの操作は取り消すことができません。')) return;
    
    // ガード2
    if (!confirm('本当によろしいですか？\n削除すると、統計グラフやカレンダーの履歴ドットもすべて初期化されます。（※登録したお薬マスターは保持されます）')) return;

    // ガード3：誤操作を100%防ぐテキスト認証
    const userInput: string | null = prompt('最終確認です。データを完全に消去する場合は、半角で「DELETE」と入力してください。');
    if (userInput !== 'DELETE') {
      alert('入力内容が一致しないため、削除処理を安全に中止しました。');
      return;
    }

    try {
      setIsSubmitting(true);

      // 服薬履歴の削除
      const { error: medLogError } = await supabase
        .from('medication_logs')
        .delete()
        .eq('user_id', currentUserId);
      if (medLogError) throw medLogError;

      // 感情ログの削除
      const { error: moodLogError } = await supabase
        .from('mood_logs')
        .delete()
        .eq('user_id', currentUserId);
      if (moodLogError) throw moodLogError;

      alert('すべてのライフログ履歴データをデータベースから完全に消去しました。');
      setRefreshTrigger(prev => !prev);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '削除に失敗しました';
      alert(`削除エラー: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = async (): Promise<void> => {
    if (!session) return;
    try {
      const { data: moodData, error: moodError } = await supabase
        .from('mood_logs')
        .select('created_at, score, memo')
        .order('created_at', { ascending: true });
      if (moodError) throw moodError;

      const { data: medData, error: medError } = await supabase
        .from('medication_logs')
        .select('logged_at, amount, medications(name)');
      if (medError) throw medError;

      const typedMoodData = moodData as CSVMoodLog[];
      const typedMedData = medData as unknown as CSVMedicationLog[];

      const header = '日付,時刻,感情スコア,服用した薬(数量),メモ';
      const rows = (typedMoodData || []).map((m: CSVMoodLog) => {
        const d = new Date(m.created_at);
        const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        const timeStr = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        const keyTime = new Date(m.created_at).setSeconds(0,0);
        const matchedMeds = (typedMedData || [])
          .filter((med: CSVMedicationLog) => new Date(med.logged_at).setSeconds(0,0) === keyTime)
          .map((med: CSVMedicationLog) => {
            let medNameText = '不明';
            if (med.medications) {
              if (Array.isArray(med.medications)) {
                medNameText = med.medications[0]?.name || '不明';
              } else {
                medNameText = med.medications.name;
              }
            }
            return `${medNameText}(${med.amount}錠)`;
          })
          .join('/');

        return [dateStr, timeStr, m.score, matchedMeds, `"${m.memo || ''}"`].join(',');
      });

      const csvContent = [header, ...rows].join('\n');
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifelog_backup_${formatDate(new Date())}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '不明なエラー';
      alert(`エクスポート失敗: ${errMsg}`);
    }
  };

  const handleModalSubmit = async () => {
    if (!selectedScore) return alert('スコアを選択してください');
    if (!session) return;
    setIsSubmitting(true);
    try {
      const now = new Date();
      const targetDate = new Date(`${logDateTime}:00+09:00`);
      targetDate.setSeconds(now.getSeconds()); targetDate.setMilliseconds(now.getMilliseconds());
      if (targetDate > now) { alert('エラー：未来の日時指定はできません。'); setIsSubmitting(false); return; }

      const targetIsoString = targetDate.toISOString();
      const currentUserId = session.user.id;

      const { error: moodError } = await supabase.from('mood_logs').insert([{ user_id: currentUserId, score: selectedScore, memo: memo || null, created_at: targetIsoString }]);
      if (moodError) throw moodError;

      if (selectedMedIds.length > 0) {
        const medInserts = selectedMedIds.map((medId: string) => ({
          user_id: currentUserId, medication_id: medId,
          amount: medicationMaster.find((m: MedicationMaster) => m.id === medId)?.default_amount || 1.0,
          logged_at: targetIsoString
        }));
        const { error: medError } = await supabase.from('medication_logs').insert(medInserts);
        if (medError) throw medError;
      }

      alert('データを追加同期しました！');
      setSelectedScore(null); setMemo(''); setSelectedMedIds([]); setIsOpen(false);
    } catch (error: unknown) {
      alert(`同期失敗: ${(error as SupabaseCustomError).message}`);
    } finally { setIsSubmitting(false); }
  };

  const handleOpenDialog = () => {
    const now = new Date();
    const offset: number = now.getTimezoneOffset() * 60000;
    setLogDateTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    setIsOpen(true);
  };

  if (loadingAuth) return <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8A8278' }}>認証確認中...</div>;

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 14, color: '#5A5450', marginBottom: 16 }}>設定画面を見るにはログインが必要です。</p>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: '#7CB88A', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }}>ログイン画面へ</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', justifyContent: 'center', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ flexShrink: 0, padding: '16px 20px 8px', display: 'flex', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2420', margin: 0 }}>設定</h1>
        </div>

        <div className="overflow-y-auto flex-1 pb-4" style={{ scrollbarWidth: 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
          
          {/* プロフィールカード */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: '20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(42,36,32,0.05)', marginTop: 4, position: 'relative' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#D8ECA0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7CB88A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#2A2420', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.user.email}
              </div>
              <div style={{ fontSize: 13, color: '#8A8278', marginTop: 2, fontWeight: 600 }}>
                記録: {totalEntriesCount}件 ／ 薬: {medicationsCount}種
              </div>
            </div>
            
            {/* 手動データ更新ボタン */}
            <button 
              onClick={() => setRefreshTrigger(prev => !prev)}
              title="データを再読み込み"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7CB88A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
            </button>
          </div>

          {/* メニューセクション */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            
            {/* CSVエクスポートボタン */}
            <button
              onClick={handleExportCSV}
              style={{ width: '100%', padding: '14px 20px', borderRadius: 18, border: '1px solid rgba(42,36,32,0.04)', backgroundColor: '#FFFFFF', color: '#5A5450', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8278" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              全データをCSVで書き出す
            </button>

            {/* 新設：全ログデータ削除ボタン（危険色） */}
            <button
              onClick={handleDeleteAllLogs}
              style={{ width: '100%', padding: '14px 20px', borderRadius: 18, border: '1px solid rgba(224,112,112,0.15)', backgroundColor: '#FDF2F2', color: '#E07070', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E07070" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              全記録履歴の完全消去
            </button>

            {/* 集約：ログアウトボタン（離脱） */}
            <button
              onClick={handleSignOut}
              style={{ width: '100%', padding: '14px 20px', borderRadius: 18, border: '1px solid rgba(42,36,32,0.04)', backgroundColor: '#EDE8E0', color: '#6B6060', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.01)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              アカウントから離脱（ログアウト）
            </button>

          </div>

        </div>

        <FloatingActionButton onClick={handleOpenDialog} />

        {isOpen && (
          <AddEntryModal 
            onClose={() => setIsOpen(false)} logDateTime={logDateTime} onLogDateTimeChange={setLogDateTime}
            selectedScore={selectedScore} onSelectScore={setSelectedScore} medicationMaster={medicationMaster}
            selectedMedIds={selectedMedIds} onToggleMedId={(id: string) => setSelectedMedIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])}
            memo={memo} onMemoChange={setMemo} onSubmit={handleModalSubmit} isSubmitting={isSubmitting}
          />
        )}

        <NavigationBar />
      </div>
    </div>
  );
}