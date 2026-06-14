'use client';

interface HeaderProps {
  onSignOut: () => void;
}

export function Header({ onSignOut }: HeaderProps) {
  return (
    <div style={{ flexShrink: 0, padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2420', margin: 0 }}>感情ライフログ</h1>
      <button 
        onClick={onSignOut} 
        style={{ fontSize: 11, fontWeight: 700, color: '#E07070', backgroundColor: 'rgba(224,112,112,0.1)', border: 'none', padding: '6px 12px', borderRadius: 999, cursor: 'pointer' }}
      >
        離脱
      </button>
    </div>
  );
}