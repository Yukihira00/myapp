"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ModalDialog } from "@/app/components/ModalDialog";
import { useAppModal } from "@/app/hooks/useAppModal";
import { Session } from "@supabase/supabase-js";

// --- SVGアイコンコンポーネント ---
const UserIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
const ChartIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>
);
const DatabaseIcon = ({ size = 18, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);
const DownloadIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);
const WarningIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);
const TrashIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);
const LogoutIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);
const ChevronRightIcon = ({ size = 16, color = "currentColor" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

export default function Settings(): React.JSX.Element {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // プロフィール情報
  const [displayName, setDisplayName] = useState<string>("");
  const [savedDisplayName, setSavedDisplayName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);

  // 利用統計データ
  const [totalMoodLogs, setTotalMoodLogs] = useState<number>(0);
  const [totalMedicationLogs, setTotalMedicationLogs] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // 1. Supabaseの認証ステータス監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) setEmail(currentSession.user.email || "");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) setEmail(currentSession.user.email || "");
    });

    return () => subscription.unsubscribe();
  }, []);

  const { modal, showAlert, showConfirm, handlePromptChange } = useAppModal();

  // 2. プロフィールと統計データの取得
  useEffect(() => {
    if (!session) return;
    async function fetchSettingsData() {
      setStatsLoading(true);
      try {
        const userId = session!.user.id;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        const initialName =
          profileData?.display_name ||
          session!.user.user_metadata?.display_name ||
          "";
        setDisplayName(initialName);
        setSavedDisplayName(initialName);

        const { count: moodCount } = await supabase
          .from("mood_logs")
          .select("*", { count: "exact", head: true });
        if (moodCount !== null) setTotalMoodLogs(moodCount);

        const { count: medCount } = await supabase
          .from("medication_logs")
          .select("*", { count: "exact", head: true });
        if (medCount !== null) setTotalMedicationLogs(medCount);
      } catch (error) {
        console.error("データ取得失敗:", error);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchSettingsData();
  }, [session]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setIsUpdatingProfile(true);

    try {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle();
      if (existingProfile) {
        const { error } = await supabase
          .from("profiles")
          .update({
            display_name: displayName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", session.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("profiles")
          .insert([
            {
              id: session.user.id,
              display_name: displayName,
              updated_at: new Date().toISOString(),
            },
          ]);
        if (error) throw error;
      }

      setSavedDisplayName(displayName);
      setIsEditing(false);
      await showAlert("プロフィールを更新しました");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showAlert(`更新失敗: ${message}`);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(savedDisplayName);
    setIsEditing(false);
  };

  const handleExportCSV = async () => {
    if (!session) {
      await showAlert("ログインが必要です");
      return;
    }
    try {
      const { data: moodLogs, error: moodError } = await supabase
        .from("mood_logs")
        .select("created_at, score, memo")
        .order("created_at", { ascending: true });
      if (moodError) throw moodError;
      if (!moodLogs || moodLogs.length === 0) {
        await showAlert("エクスポートするデータがありません");
        return;
      }

      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      let csvContent = "記録日時,感情スコア,メモ\n";
      moodLogs.forEach((log) => {
        const sanitizedMemo = log.memo ? log.memo.replace(/"/g, '""') : "";
        csvContent += `${log.created_at},${log.score},"${sanitizedMemo}"\n`;
      });

      const blob = new Blob([bom, csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `感情ログ_エクスポート_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showAlert(`エクスポート失敗: ${message}`);
    }
  };

  const handleResetData = async () => {
    const confirmed = await showConfirm(
      "警告：これまでに記録したすべての感情ログと服薬履歴が完全に削除されます。本当に初期化しますか？",
      "初期化の確認",
      "初期化する",
      "キャンセル",
    );
    if (!confirmed) return;

    try {
      const userId = session?.user.id;
      if (!userId) return;
      const { error: moodErr } = await supabase
        .from("mood_logs")
        .delete()
        .eq("user_id", userId);
      const { error: medErr } = await supabase
        .from("medication_logs")
        .delete()
        .eq("user_id", userId);
      if (moodErr || medErr) throw new Error("一部データの削除に失敗しました");

      await showAlert("すべてのデータを初期化しました。");
      setTotalMoodLogs(0);
      setTotalMedicationLogs(0);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showAlert(`初期化失敗: ${message}`);
    }
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm(
      "ログアウトしますか？",
      "ログアウトの確認",
      "ログアウトする",
      "キャンセル",
    );
    if (!confirmed) return;
    await supabase.auth.signOut();
    router.push("/");
  };

  // アカウント退会処理
  const handleDeleteAccount = async () => {
    const firstConfirm = await showConfirm(
      "【警告】本当にアカウントを退会しますか？\nこれまでの感情ログや服薬履歴などのデータがすべて完全に削除され、元に戻すことはできません。",
      "退会の確認",
      "退会する",
      "キャンセル",
    );
    if (!firstConfirm) return;

    const secondConfirm = await showConfirm(
      "最終確認です。\n本当にすべてのデータを削除して退会しますか？",
      "最終確認",
      "はい",
      "いいえ",
    );
    if (!secondConfirm) return;

    try {
      const userId = session?.user.id;
      if (!userId) return;

      await supabase.from("mood_logs").delete().eq("user_id", userId);
      await supabase.from("medication_logs").delete().eq("user_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);

      await supabase.auth.signOut();
      await showAlert(
        "退会処理が完了し、すべてのデータが削除されました。\nご利用ありがとうございました。",
      );
      router.push("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showAlert(`退会処理に失敗しました: ${message}`);
    }
  };

  if (!session)
    return <div style={{ minHeight: "100vh", backgroundColor: "#FAF7F2" }} />;

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
          width: "100%",
          maxWidth: 420,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 80px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            scrollbarWidth: "none",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#2A2420",
              margin: "4px 0 0",
            }}
          >
            設定
          </h2>

          {/* セクション1: アカウント設定とログアウト */}
          <section
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 18,
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#6B5840",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <UserIcon color="#6B5840" /> アカウント設定
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8278",
                    marginBottom: 4,
                  }}
                >
                  メールアドレス
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 14,
                    color: "#2A2420",
                    padding: "2px 0",
                  }}
                >
                  {email}
                </span>
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8278",
                    marginBottom: 4,
                  }}
                >
                  表示名
                </span>
                {isEditing ? (
                  <form
                    onSubmit={handleUpdateProfile}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginTop: 4,
                    }}
                  >
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="名前を設定してください"
                      style={{
                        width: "100%",
                        borderRadius: 10,
                        border: "1px solid #E5E7EB",
                        backgroundColor: "#FFFFFF",
                        padding: "10px 12px",
                        fontSize: 13,
                        color: "#2A2420",
                      }}
                      maxLength={20}
                      required
                    />
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          backgroundColor: "#FAF7F2",
                          border: "none",
                          color: "#2A2420",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        キャンセル
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingProfile}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          backgroundColor: "#7CB88A",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {isUpdatingProfile ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#2A2420",
                      }}
                    >
                      {displayName || "未設定"}
                    </span>
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        backgroundColor: "#FAF7F2",
                        border: "1px solid #E5E7EB",
                        color: "#2A2420",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      編集
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ログアウトボタンをここに移動（区切り線付き） */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  backgroundColor: "#FAF7F2",
                  border: "none",
                  color: "#4B5563",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <LogoutIcon color="#4B5563" /> ログアウト
                </span>
                <ChevronRightIcon color="#8A8278" />
              </button>
            </div>
          </section>

          {/* セクション2: ライフログサマリー */}
          <section
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 18,
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#6B5840",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <ChartIcon color="#6B5840" /> ライフログサマリー
            </h3>
            {statsLoading ? (
              <p style={{ fontSize: 12, color: "#8A8278" }}>統計を計算中...</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    backgroundColor: "#FAF7F2",
                    borderRadius: 12,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{ display: "block", fontSize: 11, color: "#8A8278" }}
                  >
                    感情ログ総数
                  </span>
                  <span
                    style={{ fontSize: 20, fontWeight: 800, color: "#2A2420" }}
                  >
                    {totalMoodLogs}{" "}
                    <span style={{ fontSize: 12, fontWeight: 500 }}>件</span>
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: "#FAF7F2",
                    borderRadius: 12,
                    padding: 12,
                    textAlign: "center",
                  }}
                >
                  <span
                    style={{ display: "block", fontSize: 11, color: "#8A8278" }}
                  >
                    服薬管理総数
                  </span>
                  <span
                    style={{ fontSize: 20, fontWeight: 800, color: "#2A2420" }}
                  >
                    {totalMedicationLogs}{" "}
                    <span style={{ fontSize: 12, fontWeight: 500 }}>回</span>
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* セクション3: データ管理と高度な操作（危険な操作を下にまとめる） */}
          <section
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 20,
              padding: 18,
              border: "1px solid #E5E7EB",
              boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#6B5840",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <DatabaseIcon color="#6B5840" /> データ管理・高度な操作
            </h3>

            <button
              onClick={handleExportCSV}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                backgroundColor: "#FAF7F2",
                border: "1px solid #E5E7EB",
                color: "#2A2420",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DownloadIcon color="#2A2420" /> ログデータをCSVで書き出す
              </span>
              <ChevronRightIcon color="#8A8278" />
            </button>

            {/* 危険な操作エリア */}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <button
                onClick={handleResetData}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  backgroundColor: "#FFF5F5",
                  border: "1px solid #FEE2E2",
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <WarningIcon color="#DC2626" /> 記録データを初期化する
                </span>
                <ChevronRightIcon color="#DC2626" />
              </button>

              <button
                onClick={handleDeleteAccount}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  backgroundColor: "#FFF5F5",
                  border: "1px solid #FEE2E2",
                  color: "#DC2626",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TrashIcon color="#DC2626" /> アカウントを退会する
                </span>
                <ChevronRightIcon color="#DC2626" />
              </button>
            </div>
          </section>

          <p
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#C4BDB3",
              margin: "10px 0",
            }}
          >
            感情日記アプリ v1.0.0
          </p>
        </div>

        {modal && (
          <ModalDialog
            open={Boolean(modal)}
            title={modal.title}
            message={modal.message}
            promptValue={modal.promptValue}
            promptPlaceholder={modal.promptPlaceholder}
            onPromptChange={handlePromptChange}
            primaryText={modal.primaryText}
            secondaryText={modal.secondaryText}
            onPrimary={modal.onPrimary}
            onSecondary={modal.onSecondary}
            isDanger={modal.isDanger}
            onClose={modal.onSecondary ?? modal.onPrimary}
          />
        )}
      </div>
    </div>
  );
}
