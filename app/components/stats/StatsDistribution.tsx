'use client';

interface StatsDistributionProps {
  veryGoodPct: number;
  goodPct: number;
  normalPct: number;
  badPct: number;
  veryBadPct: number;
}

export function StatsDistribution({ veryGoodPct, goodPct, normalPct, badPct, veryBadPct }: StatsDistributionProps) {
  // すべての割合が0、つまりデータが1件もない状態かどうかを判定
  const hasNoData = veryGoodPct === 0 && goodPct === 0 && normalPct === 0 && badPct === 0 && veryBadPct === 0;

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 24, padding: '16px 20px', border: '1px solid rgba(42,36,32,0.05)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#2A2420' }}>気分の分布</span>
      <div style={{ marginTop: 12 }}>
        
        {/* 5色の割合カラーバー */}
        <div style={{ height: 24, borderRadius: 999, overflow: 'hidden', display: 'flex', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', backgroundColor: '#EDE8E0' }}>
          {hasNoData ? (
            <div style={{ width: '100%', backgroundColor: '#EDE8E0' }} />
          ) : (
            <>
              <div style={{ width: `${veryGoodPct}%`, backgroundColor: '#F5FAD0', transition: 'width 0.4s' }} />
              <div style={{ width: `${goodPct}%`, backgroundColor: '#D8EC96', transition: 'width 0.4s' }} />
              <div style={{ width: `${normalPct}%`, backgroundColor: '#B8A882', transition: 'width 0.4s' }} />
              <div style={{ width: `${badPct}%`, backgroundColor: '#484848', transition: 'width 0.4s' }} />
              <div style={{ width: `${veryBadPct}%`, backgroundColor: '#1A1A1A', transition: 'width 0.4s' }} />
            </>
          )}
        </div>

        {/* 凡例ラベル（色と%のみのシンプル構成） */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#F5FAD0', border: '1px solid #EAE6DF' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5450' }}>{veryGoodPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#D8EC96' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5450' }}>{goodPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#B8A882' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5450' }}>{normalPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#484848' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5450' }}>{badPct}%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#1A1A1A' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5450' }}>{veryBadPct}%</span>
          </div>
        </div>

        {hasNoData && (
          <p style={{ margin: '10px 0 0', fontSize: 11, color: '#8A8278', textAlign: 'center' }}>
            選択された期間のログがありません
          </p>
        )}
      </div>
    </div>
  );
}