'use client';

import React from 'react';

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
  onLogClick?: (log: TimelineLog) => void;
}

export function TimelineList({
  timelineLogs,
  getScoreColor,
  onLogClick,
}: TimelineListProps) {
  return (
    <div style={{ padding: '0 20px', marginTop: 20 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: '#2A2420', marginBottom: 12 }}>
        本日のタイムライン
      </h3>
      {timelineLogs.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8A8278', textAlign: 'center', marginTop: 20 }}>
          この日の記録はありません
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {timelineLogs.map((log) => {
            const colors = getScoreColor(log.score);
            return (
              <div
                key={log.id}
                onClick={() => onLogClick?.(log)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: '12px 16px',
                  border: '1px solid rgba(42,36,32,0.05)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FDFBF7')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                {/* スコア数値のみを表示（絵文字は完全排除） */}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  {log.score}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#2A2420' }}>
                      {log.time}
                    </span>
                    {log.meds.length > 0 && (
                      <span style={{ fontSize: 11, color: '#7CB88A', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.meds.join(', ')}
                      </span>
                    )}
                  </div>
                  {log.memo && (
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B6060', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.memo}
                    </p>
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