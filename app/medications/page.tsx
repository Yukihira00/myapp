'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

// 共通パーツのインポート
import NavigationBar from '@/app/components/NavigationBar';
import { FloatingActionButton } from '@/app/components/FloatingActionButton';
import { AddEntryModal } from '@/app/components/AddEntryModal';

interface Medication {
  id: string;
  name: string;
  default_amount: number;
}

interface SupabaseCustomError {
  message: string;
}

export default function MedicationsPage(): React.JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // フォームインラインステート
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [medName, setMedName] = useState<string>('');
  const [defaultAmount, setDefaultAmount] = useState<string>('1.0');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  // --- 【解消ポイント1】データ取得関数をEffect内に集約 ＆ 同期ステート更新警告を完全排除 ---
  useEffect(() => {
    let active = true;
    if (!session) return;
    
    async function loadMedications(): Promise<void> {
      if (!active) return;
      setIsLoadingData(true);

      const { data, error } = await supabase
        .from('medications')
        .select('id, name, default_amount')
        .order('created_at', { ascending: true });

      if (!active) return;
      if (!error && data) {
        setMedications(data as Medication[]);
      }
      setIsLoadingData(false);
    }

    loadMedications();

    return () => {
      active = false; // Cascading renders を完全に防止し、依存配列ミスマッチも解決
    };
  }, [session, isSubmitting]);

  const handleSaveMedication = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!session) return;

    const trimmedName: string = medName.trim();
    if (!trimmedName) {
      alert('薬の名前を入力してください');
      return;
    }

    const isDuplicate: boolean = medications.some(
      (m: Medication) => m.name.toLowerCase() === trimmedName.toLowerCase() && m.id !== editingId
    );
    if (isDuplicate) {
      alert('その薬は既に登録されています');
      return;
    }

    setIsSubmitting(true);
    const currentUserId: string = session.user.id;
    const amountNum: number = parseFloat(defaultAmount) || 1.0;

    try {
      if (editingId) {
        const { error } = await supabase
          .from('medications')
          .update({ name: trimmedName, default_amount: amountNum })
          .eq('id', editingId);
        if (error) throw error;
        alert('常備薬を更新しました');
      } else {
        const { error } = await supabase
          .from('medications')
          .insert([{ user_id: currentUserId, name: trimmedName, default_amount: amountNum }]);
        if (error) throw error;
        alert('新しい常備薬を登録しました');
      }

      setMedName('');
      setDefaultAmount('1.0');
      setEditingId(null);
      setShowAddForm(false);
    } catch (error: unknown) {
      alert(error && typeof error === 'object' && 'message' in error ? (error as SupabaseCustomError).message : '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedication = async (id: string, name: string): Promise<void> => {
    if (!confirm(`「${name}」をマスターから削除しますか？\n※これまでの服薬履歴データは保持されます。`)) return;
    try {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;
      alert('削除しました');
      // ステートを反転させてEffect側の再集計を安全にトリガー
      setIsSubmitting(prev => !prev);
    } catch (error: unknown) {
      alert(error && typeof error === 'object' && 'message' in error ? (error as SupabaseCustomError).message : '削除に失敗しました');
    }
  };

  const handleModalSubmit = async (): Promise<void> => {
    if (!selectedScore) return alert('スコアを選択してください');
    if (!session) return;
    setIsSubmitting(true);
    try {
      const now = new Date();
      const targetDate = new Date(`${logDateTime}:00+09:00`);
      targetDate.setSeconds(now.getSeconds()); targetDate.setMilliseconds(now.getMilliseconds());
      if (targetDate > now) { alert('エラー：未来の日時指定はできません。'); setIsSubmitting(false); return; }

      const targetIsoString: string = targetDate.toISOString();
      const currentUserId: string = session.user.id;

      const { error: moodError } = await supabase.from('mood_logs').insert([{ user_id: currentUserId, score: selectedScore, memo: memo || null, created_at: targetIsoString }]);
      if (moodError) throw moodError;

      if (selectedMedIds.length > 0) {
        const medInserts = selectedMedIds.map((medId: string) => ({
          user_id: currentUserId, medication_id: medId,
          amount: medications.find((m: Medication) => m.id === medId)?.default_amount || 1.0,
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

  const handleOpenDialog = (): void => {
    const now = new Date();
    const offset: number = now.getTimezoneOffset() * 60000;
    setLogDateTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    setIsOpen(true);
  };

  const startEdit = (med: Medication): void => {
    setEditingId(med.id);
    setMedName(med.name);
    setDefaultAmount(med.default_amount.toString());
    setShowAddForm(true);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setMedName('');
    setDefaultAmount('1.0');
    setShowAddForm(false);
  };

  if (loadingAuth) return <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8A8278' }}>認証確認中...</div>;

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <p style={{ fontSize: 14, color: '#5A5450', marginBottom: 16 }}>お薬管理を見るにはログインが必要です。</p>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', backgroundColor: '#7CB88A', color: '#FFFFFF', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }}>ログイン画面へ</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', justifyContent: 'center', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, height: '100vh', backgroundColor: '#FAF7F2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ flexShrink: 0, padding: '16px 20px 8px', display: 'flex', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2420', margin: 0 }}>お薬の管理</h1>
        </div>

        <div className="overflow-y-auto flex-1 pb-4" style={{ scrollbarWidth: 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
          
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2A2420' }}>マイお薬マスター</span>
              <span style={{ fontSize: 12, color: '#8A8278', fontWeight: 700 }}>{medications.length}種</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isLoadingData ? (
                <div style={{ textAlign: 'center', padding: 12, fontSize: 12, color: '#8A8278' }}>マスター読み込み中...</div>
              ) : medications.length === 0 && !showAddForm ? (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, textAlign: 'center', fontSize: 12, color: '#B0A8A0', border: '1px solid rgba(0,0,0,0.02)' }}>
                  登録されているお薬がありません。
                </div>
              ) : (
                medications.map((med: Medication) => {
                  const isThisEditing: boolean = editingId === med.id;
                  return (
                    <div key={med.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(42,36,32,0.03)' }}>
                      {isThisEditing ? (
                        <form onSubmit={handleSaveMedication} style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center' }}>
                          <input type="text" value={medName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedName(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 14, outline: 'none', color: '#2A2420' }} required />
                          <select value={defaultAmount} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDefaultAmount(e.target.value)} style={{ width: 75, padding: '6px 4px', borderRadius: 10, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 13, outline: 'none', backgroundColor: '#FFFFFF', color: '#2A2420' }}>
                            {[1, 2, 3, 4].map((v: number) => <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}錠</option>)}
                          </select>
                          {/* 【解消ポイント2】不当なCSSプロパティ center: 'center' を完全に除去 */}
                          <button type="submit" style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#7CB88A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <button type="button" onClick={cancelEdit} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#EDE8E0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6060" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </form>
                      ) : (
                        <>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: '#2A2420' }}>{med.name}</span>
                            <span style={{ marginLeft: 8, fontSize: 12, backgroundColor: '#F0EBE3', color: '#6B5840', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                              {med.default_amount}錠
                            </span>
                          </div>
                          <button onClick={() => startEdit(med)} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#F0EBE3', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B5840" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteMedication(med.id, med.name)} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#FBE8E8', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E07070" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </>
                      )}
                    </div>
                  );
                })
              )}

              {showAddForm && !editingId ? (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: '14px 16px', border: '1px solid rgba(42,36,32,0.05)' }}>
                  <form onSubmit={handleSaveMedication}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input type="text" value={medName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMedName(e.target.value)} placeholder="薬の名前" autoFocus style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 14, outline: 'none', color: '#2A2420' }} required />
                      <select value={defaultAmount} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDefaultAmount(e.target.value)} style={{ width: 85, padding: '8px 6px', borderRadius: 12, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 13, outline: 'none', backgroundColor: '#FFFFFF', color: '#2A2420' }}>
                        {[1, 2, 3, 4].map((v: number) => <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}錠</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '10px', borderRadius: 999, backgroundColor: '#7CB88A', color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        {isSubmitting ? '追加中...' : '追加する'}
                      </button>
                      <button type="button" onClick={cancelEdit} style={{ padding: '10px 16px', borderRadius: 999, backgroundColor: '#EDE8E0', color: '#6B6060', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                        キャンセル
                      </button>
                    </div>
                  </form>
                </div>
              ) : !editingId ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  style={{ width: '100%', padding: '14px', borderRadius: 18, border: '2px dashed rgba(42,36,32,0.15)', backgroundColor: 'transparent', color: '#7CB88A', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7CB88A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  新しいお薬を追加
                </button>
              ) : null}
            </div>
          </div>

        </div>

        <FloatingActionButton onClick={handleOpenDialog} />

        {isOpen && (
          <AddEntryModal 
            onClose={() => setIsOpen(false)} logDateTime={logDateTime} onLogDateTimeChange={setLogDateTime}
            selectedScore={selectedScore} onSelectScore={setSelectedScore} medicationMaster={medications}
            selectedMedIds={selectedMedIds} onToggleMedId={(id: string) => setSelectedMedIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])}
            memo={memo} onMemoChange={setMemo} onSubmit={handleModalSubmit} isSubmitting={isSubmitting}
          />
        )}

        <NavigationBar />
      </div>
    </div>
  );
}