'use client';

interface StatDataPoint {
  dateStr: string;
  displayLabel: string;
  avgScore: number | null;
  medCount: number;
}

interface StatsLineChartProps {
  statsData: StatDataPoint[];
  rangeMode: 'day' | 'week' | 'month' | 'year';
  getScoreColor: (score: number) => { bg: string; text: string };
}

export function StatsLineChart({ statsData, rangeMode, getScoreColor }: StatsLineChartProps) {
  // 横スクロールを無くすため、モードに関わらず基準の横幅を380pxに固定
  // これにより、親コンテナ（最大420px）の内側に必ず1画面で収まります
  const width = 380; 
  const height = 140; 
  const paddingX = 20; // 左右の余白を少し狭めてグラフ領域を広く確保
  const paddingY = 16;

  const points = statsData.map((d, index) => {
    const x = paddingX + (index / (statsData.length - 1)) * (width - paddingX * 2);
    const y = d.avgScore !== null 
      ? paddingY + ((10 - d.avgScore) / 9) * (height - paddingY * 2)
      : null;
    return { x, y, data: d };
  });

  const validPoints = points.filter(p => p.y !== null);
  let pathD = '';
  validPoints.forEach((p, idx) => {
    if (idx === 0) pathD += `M ${p.x} ${p.y}`;
    else pathD += ` L ${p.x} ${p.y}`;
  });

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: '12px 12px 8px', border: '1px solid rgba(42,36,32,0.05)' }}>
      <div style={{ paddingLeft: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2A2420' }}>感情スコア推移</span>
      </div>

      {/* overflowXをhidden（非表示）に切り替え、横幅を100%に固定 */}
      <div style={{ width: '100%', overflowX: 'hidden' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* 中央の基準線 */}
          <line x1={paddingX} y1={height / 2} x2={width - paddingX} y2={height / 2} stroke="rgba(42,36,32,0.06)" strokeDasharray="4 4" />
          
          {/* 折れ線本体 */}
          {pathD && <path d={pathD} fill="none" stroke="#7CB88A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}

          {/* ホバー時（指で触れた時）のポップアップ判定エリア（見た目の○は無しのまま） */}
          {points.map((p, idx) => {
            if (p.y === null) return null;
            return (
              <g key={idx} style={{ cursor: 'pointer' }}>
                <circle cx={p.x} cy={p.y} r={12} fill="transparent" stroke="transparent" />
                <title>{`${p.data.displayLabel} スコア: ${p.data.avgScore?.toFixed(1)} / 服薬: ${p.data.medCount}回`}</title>
              </g>
            );
          })}
        </svg>

        {/* X軸の目盛りテキスト（間引きの配置バランスを最適化） */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: `2px ${paddingX}px 0`, textAlign: 'center' }}>
          {statsData.map((d, idx) => {
            // 表示数が多くても文字が重ならないよう、月モード等は綺麗に間引いて表示
            const showLabel = 
              rangeMode === 'week' ? true : 
              rangeMode === 'day' ? idx % 6 === 0 || idx === statsData.length - 1 : 
              rangeMode === 'month' ? idx % 6 === 0 || idx === statsData.length - 1 : 
              idx % 3 === 0 || idx === statsData.length - 1;

            return (
              <span key={idx} style={{ fontSize: 9, fontFamily: 'Nunito', color: '#8A8278', width: 28, textAlign: 'center', opacity: showLabel ? 1 : 0 }}>
                {d.displayLabel}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}