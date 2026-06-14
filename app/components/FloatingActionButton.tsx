'use client';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        right: 20,
        bottom: 96, // ナビゲーションバーのすぐ上に配置されるよう厳密に固定
        width: 60,
        height: 60,
        borderRadius: '50%',
        backgroundColor: '#7CB88A',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(124,184,138,0.45)',
        zIndex: 40 // スクロール領域より必ず手前に表示
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  );
}