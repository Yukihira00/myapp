'use client';

import React, { useState, useRef } from 'react';

interface StatDataPoint {
  dateStr: string;
  displayLabel: string;
  avgScore: number | null;
  medCount: number;
}

interface StatsLineChartProps {
  statsData: StatDataPoint[];
  rangeMode: 'day' | 'week' | 'month' | 'year';
}

interface TouchPositionState {
  x: number;
  y: number;
  scrollX: number;
}

interface MappedCoordinatePoint {
  x: number;
  y: number | null;
  data: StatDataPoint;
}

export function StatsLineChart({ statsData, rangeMode }: StatsLineChartProps): React.JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const [scrollX, setScrollX] = useState<number>(0);
  const [isLongPress, setIsLongPress] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const touchStartRef = useRef<TouchPositionState>({ x: 0, y: 0, scrollX: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressActiveRef = useRef<boolean>(false);
  const isPanningActiveRef = useRef<boolean>(false);

  const isWideMode: boolean = rangeMode === 'day' || rangeMode === 'month';
  const widthScale: string = isWideMode ? '130%' : '100%';
  
  const viewBoxWidth = 500;
  const height = 130; 
  const paddingY = 16;

  // 【解消ポイント】カスケードレンダリングを防ぐため、ここにあった useEffect は完全に削除しました。
  // 呼び出し元の親コンポーネント側で key={rangeMode} を指定することで、安全に自動初期化されます。

  if (!statsData || statsData.length === 0) return null;

  const totalPoints: number = statsData.length;
  
  const points: MappedCoordinatePoint[] = statsData.map((d: StatDataPoint, index: number): MappedCoordinatePoint => {
    const x: number = totalPoints > 1 ? (index / (totalPoints - 1)) * viewBoxWidth : viewBoxWidth / 2;
    const y: number | null = d.avgScore !== null ? paddingY + ((10 - d.avgScore) / 9) * (height - paddingY * 2) : null;
    return { x, y, data: d };
  });

  const validPoints = points.filter((p: MappedCoordinatePoint) => p.y !== null);
  let pathD = '';
  validPoints.forEach((p: MappedCoordinatePoint, idx: number) => {
    if (idx === 0) pathD += `M ${p.x} ${p.y}`;
    else pathD += ` L ${p.x} ${p.y}`;
  });

  const getClosestPointIndex = (clientX: number): number | null => {
    if (!wrapperRef.current) return null;
    const rect: DOMRect = wrapperRef.current.getBoundingClientRect();
    const touchXInWrapper: number = clientX - rect.left;
    const percent: number = Math.max(0, Math.min(1, touchXInWrapper / rect.width));
    return Math.round(percent * (totalPoints - 1));
  };

  const handleStart = (clientX: number, clientY: number): void => {
    touchStartRef.current = { x: clientX, y: clientY, scrollX };
    isLongPressActiveRef.current = false;
    isPanningActiveRef.current = false;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      if (!isPanningActiveRef.current) {
        isLongPressActiveRef.current = true;
        setIsLongPress(true);
        const idx: number | null = getClosestPointIndex(clientX);
        setActiveIndex(idx);
      }
    }, 400);
  };

  const handleMove = (clientX: number, clientY: number): void => {
    const deltaX: number = clientX - touchStartRef.current.x;
    const deltaY: number = clientY - touchStartRef.current.y;

    if (!isLongPressActiveRef.current && !isPanningActiveRef.current) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        isPanningActiveRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
      }
    }

    if (isLongPressActiveRef.current) {
      const idx: number | null = getClosestPointIndex(clientX);
      setActiveIndex(idx);
    } else if (isPanningActiveRef.current && isWideMode && containerRef.current && wrapperRef.current) {
      const containerW: number = containerRef.current.clientWidth;
      const wrapperW: number = wrapperRef.current.clientWidth;
      const maxScroll: number = wrapperW - containerW;

      let newScrollX: number = touchStartRef.current.scrollX + deltaX;
      if (newScrollX > 0) newScrollX = 0; 
      if (newScrollX < -maxScroll) newScrollX = -maxScroll; 
      setScrollX(newScrollX);
    }
  };

  const handleEnd = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsLongPress(false);
    setActiveIndex(null);
    isLongPressActiveRef.current = false;
    isPanningActiveRef.current = false;
  };

  const activePoint: MappedCoordinatePoint | null = activeIndex !== null ? points[activeIndex] : null;

  return (
    <div 
      ref={containerRef} 
      style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: '12px 14px 10px', border: '1px solid rgba(42,36,32,0.05)', width: '100%', overflow: 'hidden', position: 'relative', userSelect: 'none', touchAction: 'none' }}
      onTouchStart={(e: React.TouchEvent<HTMLDivElement>): void => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e: React.TouchEvent<HTMLDivElement>): void => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e: React.MouseEvent<HTMLDivElement>): void => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e: React.MouseEvent<HTMLDivElement>): void => { if (e.buttons === 1) handleMove(e.clientX, e.clientY); }}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        {isLongPress && activePoint && activePoint.y !== null ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#FAF7F2', border: '1.5px solid #7CB88A', padding: '2px 10px', borderRadius: 999 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#6B5840' }}>{activePoint.data.dateStr}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#7CB88A' }}>スコア: {activePoint.data.avgScore?.toFixed(1)}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#8A8278' }}>服薬: {activePoint.data.medCount}回</span>
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2A2420' }}>感情スコア推移</span>
        )}
        <span style={{ fontSize: 9, color: '#B0A8A0', fontWeight: 600 }}>
          {isLongPress ? '詳細確認中' : isWideMode ? '左右ドラッグ可' : '1画面表示中'}
        </span>
      </div>

      <div 
        ref={wrapperRef} 
        style={{ width: widthScale, transform: `translateX(${scrollX}px)`, transition: isLongPress ? 'none' : 'transform 0.05s ease-out', overflowX: 'hidden' }}
      >
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${viewBoxWidth} ${height}`} 
          preserveAspectRatio="none"
          style={{ overflow: 'visible', display: 'block' }}
        >
          <line x1={0} y1={height / 2} x2={viewBoxWidth} y2={height / 2} stroke="rgba(42,36,32,0.06)" strokeDasharray="4 4" />
          
          {pathD && <path d={pathD} fill="none" stroke="#7CB88A" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />}

          {isLongPress && activePoint && activePoint.y !== null && (
            <g>
              <line x1={activePoint.x} y1={0} x2={activePoint.x} y2={height} stroke="#7CB88A" strokeWidth={1.5} strokeDasharray="3 3" />
              <circle cx={activePoint.x} cy={activePoint.y} r={4} fill="#7CB88A" stroke="#FFFFFF" strokeWidth={1.5} />
            </g>
          )}
        </svg>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', width: '100%' }}>
          {statsData.map((d: StatDataPoint, idx: number): React.JSX.Element => {
            const showLabel: boolean = 
              rangeMode === 'week' ? true : 
              rangeMode === 'day' ? idx % 6 === 0 || idx === statsData.length - 1 : 
              rangeMode === 'month' ? idx % 6 === 0 || idx === statsData.length - 1 : 
              idx % 3 === 0 || idx === statsData.length - 1;

            return (
              <span key={idx} style={{ fontSize: 9, fontFamily: 'Nunito', color: '#8A8278', opacity: showLabel ? 1 : 0, whiteSpace: 'nowrap', width: '0px', display: 'flex', justifyContent: 'center', fontWeight: 600 }}>
                {d.displayLabel}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}