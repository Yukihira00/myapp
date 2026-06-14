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

        {/* 【追加】設定（常備薬マスター）タブ */}
        <Link 
          href="/settings" 
          className={`flex flex-col items-center justify-center w-full h-full text-center transition-colors ${
            isActive('/settings') ? 'text-emerald-600 font-bold' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767c-.304.232-.434.629-.377.1l.006.18c.003.115.003.23 0 .345l-.006.18c-.056.43.073.828.378 1.06l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.075.124a2.08 2.08 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.644-.87a2.08 2.08 0 0 1-.22-.127a1.125 1.125 0 0 0-1.075-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.767c.304-.23.434-.629.377-1.06l-.006-.18a3.284 3.284 0 0 1 0-.345l.006-.18c.056-.43-.073-.827-.377-1.06l-1.004-.767a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124c.072-.044.146-.086.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <span className="text-[10px] mt-1">設定</span>
        </Link>
      </div>
    </nav>
  );
}