"use client";

import { useMemo } from "react";

// 厳密なインターフェース定義
interface MedicationCorrelation {
  medicationName: string;
  takenAvg: number | null;
  notTakenAvg: number | null;
  count: number;
}

interface MoodLog {
  created_at: string;
  score: number;
}

interface MedicationLog {
  logged_at: string;
  medication_id: string;
}

interface MedicationMaster {
  id: string;
  name: string;
  default_amount: number;
}

interface StatsCorrelationCardProps {
  moodData: MoodLog[];
  medData: MedicationLog[];
  medicationMaster: MedicationMaster[];
}

export function StatsCorrelationCard({
  moodData,
  medData,
  medicationMaster,
}: StatsCorrelationCardProps) {
  // useMemo を使用してPropsの変更時に同期して計算（useState / useEffect を排除）
  const correlations = useMemo<MedicationCorrelation[]>(() => {
    // 1. 日ごとの平均感情スコアを算出
    const dayMoodMap = new Map<string, { sum: number; count: number }>();
    moodData.forEach((record) => {
      if (!record.created_at || typeof record.score !== "number") return;
      const dateStr = record.created_at.split("T")[0];
      const current = dayMoodMap.get(dateStr) ?? { sum: 0, count: 0 };
      current.sum += record.score;
      current.count += 1;
      dayMoodMap.set(dateStr, current);
    });

    const dayAvgMood = new Map<string, number>();
    dayMoodMap.forEach((val, key) => {
      dayAvgMood.set(key, val.sum / val.count);
    });

    // 2. 日ごとに服用した薬のIDを整理
    const dayMedsMap = new Map<string, Set<string>>();
    medData.forEach((record) => {
      if (!record.logged_at || !record.medication_id) return;
      const dateStr = record.logged_at.split("T")[0];
      if (!dayMedsMap.has(dateStr)) {
        dayMedsMap.set(dateStr, new Set<string>());
      }
      dayMedsMap.get(dateStr)!.add(record.medication_id);
    });

    // 3. 各お薬の「服用日」と「非服用日」のスコア差を計算
    return medicationMaster
      .map((med) => {
        let takenSum = 0;
        let takenDays = 0;
        let notTakenSum = 0;
        let notTakenDays = 0;

        dayAvgMood.forEach((avgScore, dateStr) => {
          const medsSet = dayMedsMap.get(dateStr);
          if (medsSet && medsSet.has(med.id)) {
            takenSum += avgScore;
            takenDays += 1;
          } else {
            notTakenSum += avgScore;
            notTakenDays += 1;
          }
        });

        return {
          medicationName: med.name,
          takenAvg:
            takenDays > 0 ? Math.round((takenSum / takenDays) * 10) / 10 : null,
          notTakenAvg:
            notTakenDays > 0
              ? Math.round((notTakenSum / notTakenDays) * 10) / 10
              : null,
          count: takenDays,
        };
      })
      .filter((item) => item.count >= 3); // 3回以上服用している薬のみ表示
  }, [moodData, medData, medicationMaster]);

  if (correlations.length === 0) return null;

  return (
    <div
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
          fontWeight: 800,
          color: "#2A2420",
          margin: "0 0 12px",
        }}
      >
        📊 お薬と気分の相関関係
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {correlations.map((c, i) => {
          const diff =
            c.takenAvg !== null && c.notTakenAvg !== null
              ? Math.round((c.takenAvg - c.notTakenAvg) * 10) / 10
              : 0;
          const isPositive = diff > 0;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: "#2A2420" }}>
                  {c.medicationName}
                </span>
                <span style={{ fontSize: 11, color: "#8A8278", marginLeft: 6 }}>
                  ({c.count}回服用)
                </span>
              </div>
              <div
                style={{
                  textAlign: "right",
                  fontWeight: 700,
                  color: isPositive ? "#7CB88A" : "#6B6060",
                }}
              >
                服用時: {c.takenAvg ?? "-"}{" "}
                <span
                  style={{
                    fontSize: 11,
                    color: "#8A8278",
                    fontWeight: "normal",
                  }}
                >
                  / 非服用時: {c.notTakenAvg ?? "-"}
                </span>
                <span
                  style={{
                    marginLeft: 8,
                    padding: "2px 6px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    backgroundColor: isPositive ? "#F0FDF4" : "#F3F4F6",
                  }}
                >
                  {isPositive ? `+${diff}` : diff}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
