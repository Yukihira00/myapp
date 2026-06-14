export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  dateString: string; // "YYYY-MM-DD" 形式（Supabaseのビューとのマッピング用）
}

// 指定された年月のカレンダー用日付配列（6週分＝42マス）を生成する関数
export function generateCalendarDays(year: number, month: number): CalendarDay[] {
  // monthは1ベース (1〜12)
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  const days: CalendarDay[] = [];
  
  // 今月1日の曜日 (0: 日曜日, 1: 月曜日, ..., 6: 土曜日)
  const startDayOfWeek = startOfMonth.getDay();
  
  // 1. 前月の末尾の日付で余白を埋める
  const prevMonthEnd = new Date(year, month - 1, 0);
  const prevMonthDaysCount = prevMonthEnd.getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 2, prevMonthDaysCount - i);
    days.push({
      date: d,
      isCurrentMonth: false,
      dateString: formatDate(d),
    });
  }
  
  // 2. 当月の日付を埋める
  const currentMonthDaysCount = endOfMonth.getDate();
  for (let i = 1; i <= currentMonthDaysCount; i++) {
    const d = new Date(year, month - 1, i);
    days.push({
      date: d,
      isCurrentMonth: true,
      dateString: formatDate(d),
    });
  }
  
  // 3. 翌月の日付で42マスになるまで残りの余白を埋める
  const totalSlots = 42;
  const nextMonthDaysCount = totalSlots - days.length;
  for (let i = 1; i <= nextMonthDaysCount; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d,
      isCurrentMonth: false,
      dateString: formatDate(d),
    });
  }
  
  return days;
}

// Dateオブジェクトを "YYYY-MM-DD" の文字列に変換するヘルパー関数
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}