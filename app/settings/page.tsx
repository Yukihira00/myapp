'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import Link from 'next/link';
import NavigationBar from '@/app/components/NavigationBar';

interface Medication {
  id: string;
  name: string;
  default_amount: number;
}

interface SupabaseCustomError {
  message: string;
}

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // 新規登録・編集用フォームステート
  const [medName, setMedName] = useState('');
  const [defaultAmount, setDefaultAmount] = useState('1.0');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

// 2. 薬マスターデータの取得関数
  const fetchMedications = async () => {
    if (!session) return;
    
    // 【警告対策】状態更新の前に非同期ステップを挟み、同期的実行を回避します
    await Promise.resolve();
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

useEffect(() => {
    if (session) {
      // 非同期関数としてラップして安全に実行します
      const initializeSettings = async () => {
        await fetchMedications();
      };
      initializeSettings();
    }
  }, [session]);

  // 3. 登録・更新処理（バリデーション仕様準拠）
  const handleSaveMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const trimmedName = medName.trim();
    // 【要件チェック】空白のバリデーション
    if (!trimmedName) {
      alert('薬の名前を入力してください');
      return;
    }

    // 【要件チェック】重複登録の防止（編集時、自分自身は除く）
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
        // 編集（Update）処理
        const { error } = await supabase
          .from('medications')
          .update({ name: trimmedName, default_amount: amountNum })
          .eq('id', editingId);
        if (error) throw error;
        alert('常備薬を更新しました');
      } else {
        // 新規登録（Insert）処理
        const { error } = await supabase
          .from('medications')
          .insert([{ user_id: currentUserId, name: trimmedName, default_amount: amountNum }]);
        if (error) throw error;
        alert('新しい常備薬を登録しました');
      }

      // フォーム初期化とデータ再取得
      setMedName('');
      setDefaultAmount('1.0');
      setEditingId(null);
      fetchMedications();
    } catch (error: unknown) {
      let errMsg = 'データの保存に失敗しました。';
      if (error && typeof error === 'object' && 'message' in error) {
        errMsg = (error as SupabaseCustomError).message;
      }
      alert(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 削除処理
  const handleDeleteMedication = async (id: string, name: string) => {
    if (!confirm(`「${name}」をマスターから削除しますか？\n※これまでの服薬履歴データは保持されます。`)) return;

    try {
      const { error } = await supabase.from('medications').delete().eq('id', id);
      if (error) throw error;
      alert('削除しました');
      fetchMedications();
    } catch (error: unknown) {
      let errMsg = '削除に失敗しました。';
      if (error && typeof error === 'object' && 'message' in error) {
        errMsg = (error as SupabaseCustomError).message;
      }
      alert(errMsg);
    }
  };

  // 編集モードへの切り替え
  const startEdit = (med: Medication) => {
    setEditingId(med.id);
    setMedName(med.name);
    setDefaultAmount(med.default_amount.toString());
  };

  // 編集キャンセルの処理
  const cancelEdit = () => {
    setEditingId(null);
    setMedName('');
    setDefaultAmount('1.0');
  };

  if (loadingAuth) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">認証確認中...</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-sm text-gray-600 mb-4">設定画面を見るにはログインが必要です。</p>
        <Link href="/" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">ログイン画面へ</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 font-sans antialiased">
      <header className="bg-white px-4 py-3 shadow-sm border-b border-gray-100 sticky top-0 z-30">
        <h1 className="text-lg font-bold text-gray-800">アプリ設定</h1>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* 薬マスター登録・編集フォーム */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="text-sm font-bold text-gray-700">
            {editingId ? '常備薬の編集' : '新しい常備薬マスタの登録'}
          </h2>
          <form onSubmit={handleSaveMedication} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">薬の名前</label>
              <input
                type="text"
                placeholder="例: レクサプロ、頓服アセトアミノフェン"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>
            {/* 数量入力部分を以下のように書き換え */}
            <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">デフォルトの一回量（錠）</label>
            <select
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-emerald-600 focus:outline-none bg-white"
            >
                {[1 , 2, 3, 4].map(val => (
                <option key={val} value={val.toFixed(1)}>{val.toFixed(1)} 錠</option>
                ))}
            </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 font-bold text-white shadow-sm text-sm disabled:bg-gray-400"
              >
                {editingId ? '変更を保存' : 'マスタに追加'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 rounded-xl bg-gray-100 font-bold text-gray-600 text-sm hover:bg-gray-200"
                >
                  取消
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 登録済みカード一覧 */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700 px-1">登録済みのマイ常備薬マスタ</h2>
          {isLoadingData ? (
            <div className="text-center py-6 text-xs text-gray-400">マスタ読み込み中...</div>
          ) : medications.length === 0 ? (
            <div className="rounded-xl bg-white p-6 text-center text-xs text-gray-400 border border-gray-100 shadow-sm">
              登録されている常備薬がありません。上のフォームから追加してください。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {medications.map((med) => (
                <div key={med.id} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{med.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">既定の量: <span className="font-mono font-bold text-gray-600">{med.default_amount}</span> 錠</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(med)}
                      className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 active:scale-95 transition-transform"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDeleteMedication(med.id, med.name)}
                      className="text-xs font-bold text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 active:scale-95 transition-transform"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 【将来拡張用】データエクスポート項目（F-10）の枠組み配置 */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => alert('CSVエクスポート機能は現在準備中です。（データ抽出ロジック構築中）')}
            className="w-full py-3 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-500 shadow-sm active:bg-gray-50 transition-colors"
          >
            全データをCSV形式で書き出す（バックアップ）
          </button>
        </div>
      </div>

      <NavigationBar />
    </main>
  );
}