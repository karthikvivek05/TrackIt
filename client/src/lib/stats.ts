import { addDays, todayKey } from './utils';

export function computeStreaks(
  days: Set<string>,
): { current: number; longest: number } {
  let current = 0;
  const cursor = new Date();
  if (!days.has(todayKey())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(todayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of [...days].sort()) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }
  return { current, longest };
}

export interface HeatCell {
  key: string;
  count: number;
  level: number;
  week: number;
  day: number;
}

function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
}

export function buildHeatmap(
  countByDay: Map<string, number>,
  weeks = 53,
): HeatCell[] {
  const start = new Date(new Date().getFullYear(), 0, 1);
  start.setDate(start.getDate() - start.getDay());

  const cells: HeatCell[] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w += 1) {
    for (let d = 0; d < 7; d += 1) {
      const key = todayKey(cursor);
      const count = countByDay.get(key) || 0;
      cells.push({ key, count, level: levelFor(count), week: w, day: d });
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return cells;
}

export const HEAT_LEVELS = [
  'bg-slate-200 dark:bg-slate-800',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-300 dark:bg-emerald-700',
  'bg-emerald-400 dark:bg-emerald-600',
  'bg-emerald-500 dark:bg-emerald-500',
];
