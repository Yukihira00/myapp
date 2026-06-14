'use client';

interface ScoreColorLegendProps {
  getScoreColor: (score: number) => { bg: string; text: string };
}

export function ScoreColorLegend({ getScoreColor }: ScoreColorLegendProps) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: '16px 20px', border: '1px solid rgba(42,36,32,0.05)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#2A2420' }}>スコアカラーガイド</span>
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const col = getScoreColor(i + 1);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#F5F1EB', border: 'none', borderRadius: 999, padding: '4px 10px' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: col.bg, border: '1px solid rgba(0,0,0,0.1)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#5A5450' }}>{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}