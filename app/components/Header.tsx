'use client';

import React from 'react';

export function Header(): React.JSX.Element {
  return (
    <div style={{ flexShrink: 0, padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2420', margin: 0 }}>感情ライフログ</h1>
    </div>
  );
}