"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { FloatingActionButton } from "./FloatingActionButton";
import { AddEntryModal } from "./AddEntryModal";
import NavigationBar from "./NavigationBar";
import { Header } from "./Header";

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface SupabaseCustomError {
  message: string;
}

const getInitialDateTimeString = (): string => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // モーダル記録用共通ステート
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [selectedMedIds, setSelectedMedIds] = useState<string[]>([]);
  const [logDateTime, setLogDateTime] = useState("");
  const [medicationMaster, setMedicationMaster] = useState<MedicationMaster[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 認証状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoadingAuth(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // お薬マスターの取得
  useEffect(() => {
    if (!session) return;
    async function fetchMedications() {
      const { data, error } = await supabase
        .from("medications")
        .select("id, name, default_amount");
      if (!error && data) setMedicationMaster(data as MedicationMaster[]);
    }
    fetchMedications();
  }, [session]);

  const handleOpenDialog = () => {
    setLogDateTime(getInitialDateTimeString());
    setIsOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedScore) return alert("スコアを選択してください");
    if (!session) return;
    setIsSubmitting(true);
    try {
      const now = new Date();
      const targetDate = new Date(`${logDateTime}:00+09:00`);
      targetDate.setSeconds(now.getSeconds());
      targetDate.setMilliseconds(now.getMilliseconds());

      if (targetDate > now) {
        alert("エラー：未来の日時指定はできません。");
        setIsSubmitting(false);
        return;
      }

      const targetIsoString = targetDate.toISOString();
      const currentUserId = session.user.id;

      const { error: moodError } = await supabase
        .from("mood_logs")
        .insert([
          {
            user_id: currentUserId,
            score: selectedScore,
            memo: memo || null,
            created_at: targetIsoString,
          },
        ]);
      if (moodError) throw moodError;

      if (selectedMedIds.length > 0) {
        const medInserts = selectedMedIds.map((medId) => ({
          user_id: currentUserId,
          medication_id: medId,
          amount:
            medicationMaster.find((m) => m.id === medId)?.default_amount || 1.0,
          logged_at: targetIsoString,
        }));
        const { error: medError } = await supabase
          .from("medication_logs")
          .insert(medInserts);
        if (medError) throw medError;
      }

      alert("データを同期しました！");

      // 他のコンポーネント（HomeやStats）にデータが更新されたことをイベント通知
      window.dispatchEvent(new CustomEvent("app:data-mutated"));

      setSelectedScore(null);
      setMemo("");
      setSelectedMedIds([]);
      setIsOpen(false);
    } catch (error: unknown) {
      alert(`同期失敗: ${(error as SupabaseCustomError).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#FAF7F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          color: "#8A8278",
        }}
      >
        認証確認中...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FAF7F2",
        display: "flex",
        justifyContent: "center",
        fontFamily: "Nunito, sans-serif",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          height: "100vh",
          backgroundColor: "#FAF7F2",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* すべての画面で共通のヘッダー */}
        <Header />

        {/* 各画面のメインコンテンツ領域 */}
        <div
          className="flex-1 overflow-y-auto pb-24"
          style={{ scrollbarWidth: "none", overflowY: "auto" }}
        >
          {children}
        </div>

        {/* すべての画面で共通の浮遊追加ボタン */}
        <FloatingActionButton onClick={handleOpenDialog} />

        {/* 共通の追加モーダル */}
        {isOpen && (
          <AddEntryModal
            onClose={() => setIsOpen(false)}
            logDateTime={logDateTime}
            onLogDateTimeChange={setLogDateTime}
            selectedScore={selectedScore}
            onSelectScore={setSelectedScore}
            medicationMaster={medicationMaster}
            selectedMedIds={selectedMedIds}
            onToggleMedId={(id) =>
              setSelectedMedIds((prev) =>
                prev.includes(id)
                  ? prev.filter((mId) => mId !== id)
                  : [...prev, id],
              )
            }
            memo={memo}
            onMemoChange={setMemo}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {/* すべての画面で共通の下部ナビゲーション */}
        <NavigationBar />
      </div>
    </div>
  );
}
