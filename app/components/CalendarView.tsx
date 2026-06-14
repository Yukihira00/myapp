'use client';

interface CalendarViewProps {
  currentYear: number;
  currentMonth: number;
  selectedDateStr: string;
  dailyAverages: Record<string, number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (dateStr: string) => void;
  getScoreColor: (score: number) => { bg: string; text: string };
  formatDate: (date: Date) => string;
}

export function CalendarView({
  currentYear,
  currentMonth,
  selectedDateStr,
  dailyAverages,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  getScoreColor,
  formatDate,
}: CalendarViewProps) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const firstDow = firstDayOfMonth.getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const displayMonthStr = `${currentYear}年 ${currentMonth}月`;

  return (
    <div style={{ margin: '12px 16px 0', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      {/* 月ナビゲーション */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={onPrevMonth} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#F0EBE3', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#2A2420' }}>{displayMonthStr}</span>
        <button onClick={onNextMonth} style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#F0EBE3', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B6060" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* 曜日ラベル */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#E07070' : i === 6 ? '#7090E0' : '#8A8278', padding: '2px 0' }}>{d}</div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${currentYear}-${pad(currentMonth)}-${pad(day)}`;
          const avgScore = dailyAverages[dateStr];
          const isSelected = dateStr === selectedDateStr;
          const isToday = dateStr === formatDate(new Date());
          const col = avgScore !== undefined ? getScoreColor(avgScore) : null;

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 0', borderRadius: 10,
                backgroundColor: isSelected ? 'rgba(124,184,138,0.22)' : isToday ? 'rgba(124,184,138,0.12)' : 'transparent',
                border: isSelected ? '1.5px solid #7CB88A' : 'none', cursor: 'pointer', width: '100%'
              }}
            >
              <span style={{ fontSize: 11, fontWeight: isToday || isSelected ? 800 : 500, color: isToday || isSelected ? '#7CB88A' : '#2A2420' }}>{day}</span>
              {col ? (
                <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: col.bg, marginTop: 2, border: '1.5px solid rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              ) : (
                <div style={{ width: 18, height: 18 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* カラー凡例 */}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#1A1A1A' }} />
          <span style={{ fontSize: 10, color: '#8A8278' }}>悪い</span>
        </div>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'linear-gradient(to right, #1A1A1A, #9B8464, #C8D878, #F5FAD0)' }} />
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#F5FAD0', border: '1px solid #ddd' }} />
          <span style={{ fontSize: 10, color: '#8A8278' }}>良い</span>
        </div>
      </div>
    </div>
  );
}