"use client";

import React from "react";

interface StatDataPoint {
  dateStr: string;
  displayLabel: string;
  avgScore: number | null;
  medCount: number;
}

interface StatsLineChartProps {
  statsData: StatDataPoint[];
  rangeMode: "day" | "week" | "month" | "year";
}

export function StatsLineChart({
  statsData,
  rangeMode,
}: StatsLineChartProps): React.JSX.Element | null {
  const viewBoxWidth = 500;
  const height = 130;
  const paddingY = 16;

  const totalPoints: number = statsData.length;
  const pointsPerScreen: number =
    rangeMode === "day"
      ? 12
      : rangeMode === "week"
        ? 7
        : rangeMode === "month"
          ? 30
          : 12;
  const pointStep: number =
    viewBoxWidth / Math.max(totalPoints, pointsPerScreen);
  const gridWidth: number = Math.max(viewBoxWidth, totalPoints * pointStep);
  const widthPercent: number =
    totalPoints > pointsPerScreen
      ? Math.max(100, (totalPoints / pointsPerScreen) * 100)
      : 100;
  const maxValue: number = 10;

  if (!statsData || statsData.length === 0) return null;

  const points = statsData.map((point, idx) => {
    const x = idx * pointStep + pointStep / 2;
    const y =
      point.avgScore !== null
        ? height -
          paddingY -
          (point.avgScore / maxValue) * (height - paddingY * 2)
        : null;
    return { x, y, data: point };
  });

  const validPoints = points.filter((point) => point.y !== null);
  const linePath = validPoints.reduce<string>((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${path} L ${point.x} ${point.y}`;
  }, "");

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: "12px 14px 10px",
        border: "1px solid rgba(42,36,32,0.05)",
        width: "100%",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0, // ★ 親のFlexコンテキストによる縦潰れを完全に防止
      }}
    >
      <div
        style={{
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#2A2420" }}>
          感情スコア推移
        </span>
        <span style={{ fontSize: 9, color: "#B0A8A0", fontWeight: 600 }}>
          前後ボタンで移動
        </span>
      </div>

      <div style={{ width: `${widthPercent}%`, overflowX: "hidden" }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${gridWidth} ${height}`}
          preserveAspectRatio="none"
          style={{ overflow: "visible", display: "block" }}
        >
          <line
            x1={0}
            y1={height - paddingY}
            x2={Math.max(viewBoxWidth, totalPoints * pointStep)}
            y2={height - paddingY}
            stroke="rgba(42,36,32,0.12)"
            strokeDasharray="4 4"
          />
          <line
            x1={0}
            y1={paddingY}
            x2={Math.max(viewBoxWidth, totalPoints * pointStep)}
            y2={paddingY}
            stroke="rgba(42,36,32,0.08)"
          />

          {linePath ? (
            <path
              d={linePath}
              fill="none"
              stroke="#7CB88A"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {points
            .filter((p) => p.y !== null)
            .map((point, idx) => (
              <circle
                key={idx}
                cx={point.x}
                cy={point.y as number}
                r={4}
                fill="#7CB88A"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
        </svg>

        <div
          style={{ display: "flex", gap: 4, padding: "6px 0 0", width: "100%" }}
        >
          {statsData.map((d: StatDataPoint, idx: number): React.JSX.Element => {
            const showLabel: boolean =
              rangeMode === "day"
                ? idx % 2 === 0
                : rangeMode === "week"
                  ? true
                  : rangeMode === "month"
                    ? idx % 3 === 0
                    : idx % 1 === 0;

            return (
              <span
                key={idx}
                style={{
                  fontSize: 9,
                  fontFamily: "Nunito",
                  color: "#8A8278",
                  opacity: showLabel ? 1 : 0,
                  whiteSpace: "nowrap",
                  width: `${100 / totalPoints}%`,
                  textAlign: "center",
                  display: "inline-block",
                  fontWeight: 600,
                }}
              >
                {d.displayLabel}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
