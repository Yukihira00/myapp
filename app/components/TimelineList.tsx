'use client';

interface TimelineLog {
  id: string;
  time: string;
  score: number;
  meds: string[];
  memo: string | null;
}

interface TimelineListProps {
  selectedDateStr: string;
  timelineLogs: TimelineLog[];
  getScoreColor: (score: number) => { bg: string; text: string };
  SCORE_EMOJIS: string[];
}

export function TimelineList({
  selectedDateStr,
  timelineLogs,
  getScoreColor,
  SCORE_EMOJIS,
}: TimelineListProps) {
  const selectedDateObj = new Date(selectedDateStr);
  const formattedSelectedDay = `${selectedDateObj.getMonth() + 1}月${selectedDateObj.getDate()}日`;
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'][selectedDateObj.getDay()];

  return (
    <div style={{ margin: '20px 16px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#2A2420' }}>詳細ログ</span>
        <span style={{ fontSize: 12, color: '#8A8278' }}>{formattedSelectedDay}（{dayOfWeekStr}）</span>
      </div>

      {timelineLogs.length === 0 ? (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: '24px 20px', textAlign: 'center', border: '1px solid rgba(0,0,0,0.01)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
          <p style={{ fontSize: 14, color: '#B0A8A0', margin: 0 }}>この日のライフログはありません</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {timelineLogs.map((log) => {
            const col = getScoreColor(log.score);
            const emoji = SCORE_EMOJIS[log.score - 1] || '😐';
            return (
              <div key={log.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', boxShadow: '0 1px 3px rgba(0,0,0,0.01)' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
                  {emoji}
                </div>

                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8278' }}>{log.time}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.bg, backgroundColor: col.bg + '20', padding: '2px 10px', borderRadius: 999 }}>
                      スコア {log.score}
                    </span>
                  </div>

                  {log.meds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                      {log.meds.map((m, idx) => (
                        <span key={idx} style={{ fontSize: 11, fontWeight: 600, backgroundColor: '#F0EBE3', color: '#6B5840', padding: '2px 8px', borderRadius: 999 }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  )}

                  {log.memo && (
                    <p style={{ fontSize: 13, color: '#5A5450', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{log.memo}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}