import type { Tracker, Entry } from './types';
import { computeStreaks } from './stats';

export function entryIsComplete(
  tracker: Tracker,
  entry: Entry | null | undefined,
): boolean {
  if (!entry) return false;
  if (tracker.type === 'habit') return entry.value === true;
  if (tracker.type === 'counter' || tracker.type === 'duration') {
    return (Number(entry.value) || 0) > 0;
  }
  if (tracker.type === 'checklist') {
    const v = entry.value as { done: boolean }[] | null;
    return !!v && v.length > 0 && v.every((i) => i.done);
  }
  return false;
}

export function completedDaySet(
  tracker: Tracker,
  entries: Entry[],
): Set<string> {
  const set = new Set<string>();
  for (const e of entries) if (entryIsComplete(tracker, e)) set.add(e.date);
  return set;
}

export function trackerStreak(tracker: Tracker, entries: Entry[]) {
  return computeStreaks(completedDaySet(tracker, entries));
}

export function numericValue(entry: Entry | null | undefined): number {
  return Number(entry?.value) || 0;
}

export function totalFor(tracker: Tracker, entries: Entry[]): number {
  if (tracker.type === 'habit') {
    return entries.filter((e) => e.value === true).length;
  }
  if (tracker.type === 'checklist') {
    return completedDaySet(tracker, entries).size;
  }
  return entries.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
}
