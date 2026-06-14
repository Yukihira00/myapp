'use client';

interface StatsSummaryCardProps {
  avgAll: number;
  totalEntries: number;
  goodDaysCount: number;
}

export function StatsSummaryCard({ avgAll, totalEntries, goodDaysCount }: StatsSummaryCardProps) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: '16px 20px',
      display: 'flex',
      gap: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      border: '1px solid rgba(42,36,32,0.05)'
    }}>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#7CB88A' }}>{avgAll.toFixed(1)}</div>
        <div style={{ fontSize: 11, color: '#8A8278', fontWeight: 600 }}>平均スコア</div>
      </div>
      <div style={{ width: 1, backgroundColor: '#EDE8E0' }} />
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#2A2420' }}>{totalEntries}</div>
        <div style={{ fontSize: 11, color: '#8A8278', fontWeight: 600 }}>記録数</div>
      </div>
      <div style={{ width: 1, backgroundColor: '#EDE8E0' }} />
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#C8D878' }}>{goodDaysCount}</div>
        <div style={{ fontSize: 11, color: '#8A8278', fontWeight: 600 }}>良好な日</div>
      </div>
    </div>
  );
}