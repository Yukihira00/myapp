'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavigationBar() {
  const pathname = usePathname();

  // 現在のページURLに応じて、どのタブを光らせるかを判定するヘルパー
  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg sticky-bottom z-40 max-w-md mx-auto rounded-t-2xl">
      <div className="flex justify-around items-center h-16">
        {/* ホーム（カレンダー）タブ */}
        <Link 
          href="/" 
          className={`flex flex-col items-center justify-center w-full h-full text-center transition-colors ${
            isActive('/') ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <span className="text-[10px] mt-1">カレンダー</span>
        </Link>

        {/* 統計（分析グラフ）タブ */}
        <Link 
          href="/stats" 
          className={`flex flex-col items-center justify-center w-full h-full text-center transition-colors ${
            isActive('/stats') ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
          <span className="text-[10px] mt-1">統計分析</span>
        </Link>
      </div>
    </nav>
  );
}