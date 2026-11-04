export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, days: number): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return todayKey(d);
}

export function toKey(d: Date): string {
  return todayKey(d);
}

export function parseKey(key: string): Date {
  return new Date(key + 'T00:00:00');
}

export function lastNDays(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(todayKey(d));
  }
  return keys;
}

export function formatDate(key: string): string {
  return new Date(key + 'T00:00:00').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMinutes(min: number): string {
  if (!min) return '0m';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

export function difficultyColor(d: string): string {
  if (d === 'Easy') return 'text-emerald-600 dark:text-emerald-400';
  if (d === 'Medium') return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export const STATUSES = [
  'Not Started',
  'Solved',
] as const;

export function statusColor(status: string): string {
  switch (status) {
    case 'Solved':
      return 'bg-emerald-500';
    default:
      return 'bg-slate-400';
  }
}
