'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';
import { Session } from '@supabase/supabase-js';

// 共通コンポーネントのインポート
import NavigationBar from '@/app/components/NavigationBar';
import { FloatingActionButton } from '@/app/components/FloatingActionButton';
import { AddEntryModal } from '@/app/components/AddEntryModal';

interface Medication {
  id: string;
  name: string;
  default_amount: number;
}

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface SupabaseCustomError {
  message: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [totalEntriesCount, setTotalEntriesCount] = useState(0);

  // フォーム・マスター制御ステート
  const [showAddForm, setShowAddForm] = useState(false);
  const [medName, setMedName] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('1.0');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // どこからでも記録追加できる一貫性のためのステート
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [logDateTime, setLogDateTime] = useState('');

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

  // 2. 薬マスターデータの取得
  const fetchMedications = async () => {
    if (!session) return;
    setIsLoadingData(true);
    const { data, error } = await supabase
      .from('medications')
      .select('id, name, default_amount')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMedications(data as Medication[]);
    }
    setIsLoadingData(false);
  };

  // プロフィール用：総記録件数のカウント取得
  const fetchTotalEntriesCount = async () => {
    if (!session) return;
    const { count, error } = await supabase
      .from('mood_logs')
      .select('*', { count: 'exact', head: true });
    if (!error && count !== null) {
      setTotalEntriesCount(count);
    }
  };

  useEffect(() => {
    if (session) {
      fetchMedications();
      fetchTotalEntriesCount();
    }
  }, [session, isSubmitting]);

  // 3. マスター登録・更新処理
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const trimmedName = medName.trim();
    if (!trimmedName) {
      alert('薬の名前を入力してください');
      return;
    }

    const isDuplicate = medications.some(
      (m) => m.name.toLowerCase() === trimmedName.toLowerCase() && m.id !== editingId
    );
    if (isDuplicate) {
      alert('その薬は既に登録されています');
      return;
    }

    setIsSubmitting(true);
    const currentUserId = session.user.id;
    const amountNum = parseFloat(defaultAmount) || 1.0;

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
      fetchMedications();
    } catch (error: unknown) {
      alert(error && typeof error === 'object' && 'message' in error ? (error as SupabaseCustomError).message : '保存に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. マスター削除処理
  const handleDeleteMedication = async (id: string, name: string) => {
    if (!confirm(`「${name}」をマスターから削除しますか？\n※これまでの服薬履歴データは保持されます。`)) return;
    try {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;
      alert('削除しました');
      fetchMedications();
    } catch (error: unknown) {
      alert(error && typeof error === 'object' && 'message' in error ? (error as SupabaseCustomError).message : '削除に失敗しました');
    }
  };

  // 5. 【本格実装完了】CSV全データエクスポート抽出処理
  const handleExportCSV = async () => {
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

      const header = '日付,時刻,感情スコア,服用した薬(数量),メモ';
      const rows = (moodData || []).map((m) => {
        const d = new Date(m.created_at);
        const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
        const timeStr = d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        const keyTime = new Date(m.created_at).setSeconds(0,0);
        const matchedMeds = (medData || [])
          .filter((med) => new Date(med.logged_at).setSeconds(0,0) === keyTime)
          .map((med) => `${med.medications?.name || '不明'}(${med.amount}錠)`)
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
    } catch (err: any) {
      alert(`エクスポート失敗: ${err.message}`);
    }
  };

  // モーダルデータ保存（FAB連携用）
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
        const medInserts = selectedMedIds.map((medId) => ({
          user_id: currentUserId, medication_id: medId,
          amount: medications.find((m) => m.id === medId)?.default_amount || 1.0,
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
    const offset = now.getTimezoneOffset() * 60000;
    setLogDateTime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    setIsOpen(true);
  };

  const startEdit = (med: Medication) => {
    setEditingId(med.id);
    setMedName(med.name);
    setDefaultAmount(med.default_amount.toString());
    setShowAddForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setMedName('');
    setDefaultAmount('1.0');
    setShowAddForm(false);
  };

  if (loadingAuth) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#FAF7F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#8A8278' }}>認証確認中...</div>;
  }

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
        
        {/* ヘッダー */}
        <div style={{ flexShrink: 0, padding: '16px 20px 8px', display: 'flex', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2420', margin: 0 }}>設定</h1>
        </div>

        {/* スクロールコンテンツ */}
        <div className="overflow-y-auto flex-1 pb-4" style={{ scrollbarWidth: 'none', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '0 16px' }}>
          
          {/* プロトタイプ風 プロフィールカード */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: '20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(42,36,32,0.05)', marginTop: 4 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#D8ECA0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#7CB88A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2A2420' }}>ユーザーアカウント</div>
              <div style={{ fontSize: 13, color: '#8A8278', marginTop: 2, fontWeight: 600 }}>
                記録: {totalEntriesCount}件 ／ 薬: {medications.length}種
              </div>
            </div>
          </div>

          {/* マイ常備薬セクションヘッダー */}
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#2A2420' }}>マイ常備薬マスター</span>
              <span style={{ fontSize: 12, color: '#8A8278', fontWeight: 700 }}>{medications.length}種</span>
            </div>

            {/* 常備薬リスト・インライン編集フォーム */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {isLoadingData ? (
                <div style={{ textAlign: 'center', py: 12, fontSize: 12, color: '#8A8278' }}>マスター読み込み中...</div>
              ) : medications.length === 0 && !showAddForm ? (
                <div style={{ roundedXml: 'true', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, textAlign: 'center', fontSize: 12, color: '#B0A8A0', border: '1px solid rgba(0,0,0,0.02)' }}>
                  登録されている常備薬がありません。
                </div>
              ) : (
                medications.map((med) => {
                  const isThisEditing = editingId === med.id;
                  return (
                    <div key={med.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(42,36,32,0.03)' }}>
                      {isThisEditing ? (
                        // インライン編集フォームUI
                        <form onSubmit={handleSaveMedication} style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center' }}>
                          <input type="text" value={medName} onChange={(e) => setMedName(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 10, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 14, outline: 'none', color: '#2A2420' }} required />
                          <select value={defaultAmount} onChange={(e) => setDefaultAmount(e.target.value)} style={{ width: 75, padding: '6px 4px', borderRadius: 10, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 13, outline: 'none', backgroundColor: '#FFFFFF', color: '#2A2420' }}>
                            {[1, 2, 3, 4].map(v => <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}錠</option>)}
                          </select>
                          <button type="submit" style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#7CB88A', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                          <button type="button" onClick={cancelEdit} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#EDE8E0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6060" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </form>
                      ) : (
                        // 通常のリストカードUI
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

              {/* 新規登録インラインフォームフォームUI */}
              {showAddForm && !editingId ? (
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: '14px 16px', border: '1px solid rgba(42,36,32,0.05)' }}>
                  <form onSubmit={handleSaveMedication}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input type="text" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="薬の名前" autoFocus style={{ flex: 1, padding: '8px 12px', borderRadius: 12, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 14, outline: 'none', color: '#2A2420' }} required />
                      <select value={defaultAmount} onChange={(e) => setDefaultAmount(e.target.value)} style={{ width: 85, padding: '8px 6px', borderRadius: 12, border: '1.5px solid rgba(42,36,32,0.15)', fontSize: 13, outline: 'none', backgroundColor: '#FFFFFF', color: '#2A2420' }}>
                        {[1, 2, 3, 4].map(v => <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}錠</option>)}
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
                  新しい薬を追加
                </button>
              ) : null}
            </div>
          </div>

          {/* CSVデータエクスポートボタン */}
          <div style={{ margin: '12px 0 32px' }}>
            <button
              onClick={handleExportCSV}
              style={{ width: '100%', padding: '14px', borderRadius: 18, border: '1.5px solid rgba(42,36,32,0.12)', backgroundColor: '#FFFFFF', color: '#8A8278', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8278" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              全データをCSVで書き出す
            </button>
          </div>
        </div>

        {/* 共通パーツ化されたプラスボタン */}
        <FloatingActionButton onClick={handleOpenDialog} />

        {/* 記録追加モーダル */}
        {isOpen && (
          <AddEntryModal 
            onClose={() => setIsOpen(false)} logDateTime={logDateTime} onLogDateTimeChange={setLogDateTime}
            selectedScore={selectedScore} onSelectScore={setSelectedScore} medicationMaster={medications}
            selectedMedIds={selectedMedIds} onToggleMedId={(id) => setSelectedMedIds(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id])}
            memo={memo} onMemoChange={setMemo} onSubmit={handleModalSubmit} isSubmitting={isSubmitting}
          />
        )}

        {/* 下部固定ナビゲーションバー */}
        <NavigationBar />
      </div>
    </div>
  );
}