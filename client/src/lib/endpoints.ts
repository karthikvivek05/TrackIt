import { getWithCache, mutate, networkFetch } from './api';
import type { Step, Progress, Tracker, Entry, ChecklistItem } from './types';

export interface SheetResponse {
  steps: Step[];
}
export interface ProgressResponse {
  progress: Progress[];
}
export interface TrackersResponse {
  trackers: Tracker[];
}
export interface EntriesResponse {
  entries: Entry[];
}
export interface DayItemsResponse {
  date: string;
  items: { tracker: Tracker; entry: Entry | null }[];
}

export const api = {
  // auth
  login: (email: string, password: string) =>
    networkFetch('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    networkFetch('POST', '/auth/register', { name, email, password }),
  me: () => networkFetch('GET', '/auth/me'),
  updateMe: (payload: {
    name?: string;
    settings?: { theme?: string; dailyGoal?: number; remindersEnabled?: boolean };
  }) => networkFetch('PATCH', '/auth/me', payload),

  // dsa
  getSheet: () => getWithCache<SheetResponse>('/dsa/sheet', 'a2z-sheet'),
  getProgress: () => getWithCache<ProgressResponse>('/dsa/progress', 'progress'),
  updateProgress: (
    slug: string,
    patch: Partial<Progress> & { revised?: boolean; updatedAt?: number },
  ) => mutate('PATCH', `/dsa/progress/${slug}`, patch),

  // trackers
  getTrackers: () => getWithCache<TrackersResponse>('/trackers', 'trackers'),
  createTracker: (payload: {
    name: string;
    icon: string;
    color: string;
    type: string;
    unit?: string;
  }) => mutate('POST', '/trackers', payload),
  updateTracker: (id: string, payload: Partial<Tracker>) =>
    mutate('PATCH', `/trackers/${id}`, payload),
  deleteTracker: (id: string) => mutate('DELETE', `/trackers/${id}`),
  getTrackerEntries: (id: string) =>
    getWithCache<EntriesResponse>(`/trackers/${id}/entries`, `entries:${id}`),
  getEntriesByDate: (date: string) =>
    getWithCache<DayItemsResponse>(
      `/trackers/entries?date=${date}`,
      `entriesByDate:${date}`,
    ),
  upsertEntry: (
    id: string,
    date: string,
    payload: {
      value: boolean | number | ChecklistItem[] | null;
      note?: string;
      updatedAt: number;
    },
  ) => mutate('PUT', `/trackers/${id}/entries/${date}`, payload),

  // data
  exportData: () => networkFetch('GET', '/export'),
  importData: (data: unknown) => networkFetch('POST', '/import', { data }),
};
