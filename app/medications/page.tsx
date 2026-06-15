"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { ModalDialog } from "@/app/components/ModalDialog";
import { useAppModal } from "@/app/hooks/useAppModal";

// --- 新しく作ったファイルからアイコンを読み込む ---
import {
  PlusIcon,
  CapsuleIcon,
  TabletIcon,
  TrashIcon,
  ChevronRightIcon,
} from "@/app/components/icons";

interface Medication {
  id: string;
  name: string;
  default_amount: number;
  icon_type?: "tablet" | "capsule";
}

export default function MedicationsPage(): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // モーダル管理ステート
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // フォーム入力値
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("1");
  const [iconType, setIconType] = useState<"tablet" | "capsule">("tablet");
  const [isSaving, setIsSaving] = useState(false);
  const { modal, showAlert, showConfirm, handlePromptChange } = useAppModal();

  async function fetchMedications(userId: string) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (data) setMedications(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("薬データの取得に失敗しました:", message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) fetchMedications(currentSession.user.id);
    });
  }, []);

  const openModal = (mode: "add" | "edit", med?: Medication) => {
    setModalMode(mode);
    if (mode === "edit" && med) {
      setEditingId(med.id);
      setName(med.name);
      setAmount(med.default_amount.toString());
      setIconType(med.icon_type || "tablet");
    } else {
      setEditingId(null);
      setName("");
      setAmount("1");
      setIconType("tablet");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setName("");
    setAmount("1");
    setIconType("tablet");
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !name.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        user_id: session.user.id,
        name: name.trim(),
        default_amount: parseFloat(amount) || 1,
        icon_type: iconType,
      };

      if (modalMode === "add") {
        const { error } = await supabase.from("medications").insert([payload]);
        if (error) throw error;
      } else if (modalMode === "edit" && editingId) {
        const { error } = await supabase
          .from("medications")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      }

      await fetchMedications(session.user.id);
      closeModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showAlert(`保存に失敗しました: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!session || !editingId) return;
    const confirmed = await showConfirm(
      `「${name}」を削除しますか？`,
      "削除の確認",
      "削除する",
      "キャンセル",
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("medications")
        .delete()
        .eq("id", editingId);
      if (error) throw error;

      await fetchMedications(session.user.id);
      closeModal();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      await showAlert(`削除に失敗しました: ${message}`);
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
          position: "relative",
        }}
      >
        {/* 薬リスト */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <button
            onClick={() => openModal("add")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              backgroundColor: "#7CB88A",
              border: "none",
              color: "#FFFFFF",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 8,
              boxShadow: "0 4px 12px rgba(124, 184, 138, 0.3)",
            }}
          >
            <PlusIcon /> 新しいお薬を登録
          </button>

          {isLoading ? (
            <p
              style={{
                textAlign: "center",
                color: "#8A8278",
                fontSize: 13,
                marginTop: 20,
              }}
            >
              読み込み中...
            </p>
          ) : medications.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#C4BDB3",
              }}
            >
              <CapsuleIcon size={40} color="#E5E7EB" />
              <p style={{ fontSize: 13, marginTop: 12 }}>
                登録されているお薬はありません
              </p>
            </div>
          ) : (
            medications.map((med) => (
              <div
                key={med.id}
                onClick={() => openModal("edit", med)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: "16px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      backgroundColor: "#FAF7F2",
                      borderRadius: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {med.icon_type === "capsule" ? (
                      <CapsuleIcon color="#6B5840" size={20} />
                    ) : (
                      <TabletIcon color="#6B5840" size={20} />
                    )}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#2A2420",
                        margin: 0,
                      }}
                    >
                      {med.name}
                    </h3>
                    <p
                      style={{
                        fontSize: 12,
                        color: "#8A8278",
                        margin: "4px 0 0",
                      }}
                    >
                      デフォルト: {med.default_amount} 錠
                    </p>
                  </div>
                </div>
                <ChevronRightIcon color="#C4BDB3" />
              </div>
            ))
          )}
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
            onClose={modal.onSecondary}
          />
        )}

        {/* モーダル */}
        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(42, 36, 32, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: 20,
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 24,
                width: "100%",
                maxWidth: 340,
                padding: 24,
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
              }}
            >
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#2A2420",
                  margin: "0 0 20px",
                  textAlign: "center",
                }}
              >
                {modalMode === "add" ? "新しいお薬の登録" : "お薬の編集"}
              </h3>

              <form
                onSubmit={handleSave}
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8A8278",
                      marginBottom: 6,
                    }}
                  >
                    アイコン
                  </label>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setIconType("tablet")}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        border:
                          iconType === "tablet"
                            ? "2px solid #7CB88A"
                            : "1px solid #E5E7EB",
                        backgroundColor:
                          iconType === "tablet" ? "#F0FDF4" : "#FFFFFF",
                        transition: "all 0.2s",
                      }}
                    >
                      <TabletIcon
                        color={iconType === "tablet" ? "#7CB88A" : "#8A8278"}
                        size={28}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: iconType === "tablet" ? "#2A2420" : "#8A8278",
                        }}
                      >
                        錠剤
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIconType("capsule")}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: 12,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        border:
                          iconType === "capsule"
                            ? "2px solid #7CB88A"
                            : "1px solid #E5E7EB",
                        backgroundColor:
                          iconType === "capsule" ? "#F0FDF4" : "#FFFFFF",
                        transition: "all 0.2s",
                      }}
                    >
                      <CapsuleIcon
                        color={iconType === "capsule" ? "#7CB88A" : "#8A8278"}
                        size={28}
                      />
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: iconType === "capsule" ? "#2A2420" : "#8A8278",
                        }}
                      >
                        カプセル
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8A8278",
                      marginBottom: 6,
                    }}
                  >
                    お薬の名前
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: ロキソニン"
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #E5E7EB",
                      backgroundColor: "#FAF7F2",
                      padding: "12px 14px",
                      fontSize: 14,
                      color: "#2A2420",
                    }}
                    required
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#8A8278",
                      marginBottom: 6,
                    }}
                  >
                    デフォルトの量
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        backgroundColor: "#FAF7F2",
                        padding: "12px 14px",
                        fontSize: 14,
                        color: "#2A2420",
                        appearance: "none",
                        cursor: "pointer",
                      }}
                      required
                    >
                      <option value="1">1 錠</option>
                      <option value="1.5">1.5 錠</option>
                      <option value="2">2 錠</option>
                      <option value="3">3 錠</option>
                      <option value="4">4 錠</option>
                    </select>
                    <div
                      style={{
                        position: "absolute",
                        right: 14,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#8A8278"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#C4BDB3",
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    ※ 記録時に入力の手間を省くためのデフォルト値です。
                  </p>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: 12,
                      backgroundColor: "#F3F4F6",
                      border: "none",
                      color: "#4B5563",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: 12,
                      backgroundColor: "#7CB88A",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {isSaving ? "保存中..." : "保存する"}
                  </button>
                </div>
              </form>

              {modalMode === "edit" && (
                <button
                  type="button"
                  onClick={handleDelete}
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
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 24,
                  }}
                >
                  <TrashIcon color="#DC2626" /> このお薬を削除する
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
