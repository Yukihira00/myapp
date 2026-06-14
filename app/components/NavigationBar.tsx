'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NavTabItem {
  path: string;
  label: string;
  icon: string;
}

interface NavIconProps {
  icon: string;
  active: boolean;
}

const NAV_TABS: NavTabItem[] = [
  { path: '/', label: 'カレンダー', icon: 'home' },
  { path: '/stats', label: '統計', icon: 'stats' },
  { path: '/medications', label: 'お薬管理', icon: 'pill' }, // 新設タブ
  { path: '/settings', label: '設定', icon: 'settings' },
];

function NavIcon({ icon, active }: NavIconProps): React.JSX.Element {
  const color: string = active ? '#FFFFFF' : '#8A8278';
  
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
  if (icon === 'pill') return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </svg>
  );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  );
}

export default function NavigationBar(): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px 24px', backgroundColor: '#FAF7F2', borderTop: '1px solid rgba(42,36,32,0.06)', width: '100%' }}>
      {NAV_TABS.map(({ path, label, icon }: NavTabItem) => {
        const active: boolean = path === '/' ? pathname === '/' : pathname.startsWith(path);
        
        return (
          <button
            key={path}
            onClick={() => router.push(path)}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', flex: 1 }}
          >
            <div style={{ width: 44, height: 34, borderRadius: 18, backgroundColor: active ? '#7CB88A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}>
              <NavIcon icon={icon} active={active} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#7CB88A' : '#8A8278', whiteSpace: 'nowrap' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}