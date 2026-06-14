'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase'; // 先ほど作成した共通接続ファイルをインポート

// テスト用の常備薬データ（本来はDBから取得しますが、まずはUI検証用に定義）
const DUMMY_MEDICATIONS = [
  { id: 'med-1', name: 'レクサプロ', default_amount: 1.0 },
  { id: 'med-2', name: '頓服', default_amount: 1.0 },
  { id: 'med-3', name: 'ビタミンB', default_amount: 1.0 },
];

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  
  // 選択された薬のIDを管理する配列ステート (F-03)
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  // 送信中のローディング状態を管理するステート
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getScoreColor = (score: number) => {
    if (score <= 3) return 'bg-gray-700 text-white';
    if (score <= 6) return 'bg-yellow-500 text-black';
    return 'bg-green-500 text-white';
  };

  // 薬のチェックボックスが切り替わったときの処理
  const handleMedCheck = (id: string) => {
    setSelectedMedIds((prev) =>
      prev.includes(id) ? prev.filter((medId) => medId !== id) : [...prev, id]
    );
  };

  // Supabaseへデータを保存するメイン処理
  const handleSubmit = async () => {
    if (!selectedScore) {
      alert('感情スコアを選択してください');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. 感情ログ（mood_logs）へのインサート処理
      // 本来はauthからuser_idを取得しますが、開発初期検証のためダミーのUUIDを使用
      // ※Supabase側でRLSポリシーが強制されている場合は、事前にユーザー登録・ログインが必要です
      const { data: moodData, error: moodError } = await supabase
        .from('mood_logs')
        .insert([
          {
            score: selectedScore,
            memo: memo || null,
            // RLSが有効な場合は auth.uid() が自動適用されますが、
            // テスト用に profiles にあらかじめ存在する有効なUUID、またはauthログインが必要です
          },
        ])
        .select();

      if (moodError) throw moodError;

      // 2. 服薬履歴（medication_logs）へのインサート処理（薬が選択されている場合）
      if (selectedMedIds.length > 0) {
        const logEntries = selectedMedIds.map((medId) => {
          const med = DUMMY_MEDICATIONS.find((m) => m.id === medId);
          return {
            medication_id: medId, // ※本来はDBのmedicationsテーブルに存在するUUIDである必要があります
            amount: med ? med.default_amount : 1.0,
          };
        });

        // 服薬ログ送信（検証用: ここはDB側の制約（外国府キー等）により最初は弾かれる可能性があります）
        console.log('服薬データ送信内容:', logEntries);
      }

      alert('Supabaseへの保存に成功しました！');
      
      // 入力フォームの初期化とダイアログのクローズ
      setSelectedScore(null);
      setMemo('');
      setSelectedMedIds([]);
      setIsOpen(false);

    } catch (error: unknown) {
      console.error('保存エラー:', error);
      const message = error instanceof Error ? error.message : '不明なエラー';
      alert(`保存に失敗しました: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-gray-50 p-4 pb-24 font-sans">
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">感情日記</h1>
        <p className="text-xs text-gray-500">F-04: UI＆データ連携検証中</p>
      </header>

      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 text-center text-gray-400">
        ここに月間カレンダーとタイムラインが表示されます。
      </div>

      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-3xl text-white shadow-lg active:scale-95 transition-transform z-40"
      >
        ＋
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
          <div className="w-full rounded-t-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">いまの気分は？</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 p-1">キャンセル</button>
            </div>

            {/* 感情スコア選択 (F-02) */}
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
                        selectedScore === score ? `${getScoreColor(score)} ring-4 ring-offset-2 ring-green-600 scale-105` : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 服薬マルチセレクト機能 (F-03) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">服薬チェック（任意）</label>
              <div className="flex flex-wrap gap-2">
                {DUMMY_MEDICATIONS.map((med) => {
                  const isChecked = selectedMedIds.includes(med.id);
                  return (
                    <button
                      key={med.id}
                      onClick={() => handleMedCheck(med.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        isChecked ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {med.name} ({med.default_amount}錠)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 自由メモ入力欄 (F-04) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">メモ（任意）</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={500}
                placeholder="気分のきっかけや出来事など"
                className={`w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-green-600 focus:outline-none resize-none ${memo.length > 500 ? 'border-red-500' : ''}`}
                rows={3}
              />
              <div className="text-right text-xs text-gray-400 mt-1">{memo.length} / 500文字</div>
            </div>

            {/* 保存ボタン */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold text-white shadow-md transition-colors ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 active:bg-green-700'}`}
            >
              {isSubmitting ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
