'use client';

import { useRouter, usePathname } from 'next/navigation';

const NAV_TABS = [
  { path: '/', label: 'カレンダー', icon: 'home' },
  { path: '/stats', label: '統計', icon: 'stats' },
  { path: '/settings', label: '設定', icon: 'settings' },
];

function NavIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? '#FFFFFF' : '#8A8278';
  if (icon === 'home') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="4"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
    </svg>
  );
  if (icon === 'stats') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}

export default function NavigationBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 16px 24px', backgroundColor: '#FAF7F2', borderTop: '1px solid rgba(42,36,32,0.06)', width: '100%' }}>
      {NAV_TABS.map(({ path, label, icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px' }}
          >
            <div style={{ width: 48, height: 36, borderRadius: 18, backgroundColor: active ? '#7CB88A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
              <NavIcon icon={icon} active={active} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#7CB88A' : '#8A8278' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}