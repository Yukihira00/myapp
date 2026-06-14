'use client';

interface StatsDistributionProps {
  goodPct: number;
  medPct: number;
  badPct: number;
}

export function StatsDistribution({ goodPct, medPct, badPct }: StatsDistributionProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: '16px 20px', border: '1px solid rgba(42,36,32,0.05)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#2A2420' }}>気分の分布</span>
      <div style={{ marginTop: 12 }}>
        {/* 3色の割合カラーバー */}
        <div style={{ height: 24, borderRadius: 999, overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ width: `${goodPct}%`, backgroundColor: '#D8EC96', transition: 'width 0.4s' }} />
          <div style={{ width: `${medPct}%`, backgroundColor: '#B8A882', transition: 'width 0.4s' }} />
          <div style={{ width: `${badPct}%`, backgroundColor: '#2E2E2E', transition: 'width 0.4s' }} />
        </div>

        {/* 凡例ラベル */}
        <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#D8EC96' }} />
            <span style={{ fontSize: 12, color: '#5A5450' }}>良好 {goodPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#B8A882' }} />
            <span style={{ fontSize: 12, color: '#5A5450' }}>普通 {medPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: '#2E2E2E' }} />
            <span style={{ fontSize: 12, color: '#5A5450' }}>不良 {badPct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}