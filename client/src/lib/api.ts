import { db } from './db';

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('trackit_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export function isNetworkError(e: unknown): boolean {
  return (
    e instanceof TypeError ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  );
}

export async function networkFetch(
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  const res = await fetch(BASE + path, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trackit:unauthorized'));
    }
    throw new ApiError(data?.error || 'Unauthorized', 401);
  }
  if (!res.ok) {
    throw new ApiError(data?.error || res.statusText, res.status);
  }
  return data;
}

export async function getWithCache<T>(
  path: string,
  cacheKey: string,
): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = await networkFetch('GET', path);
    await db.cache.put({ key: cacheKey, value: data, updatedAt: Date.now() });
    return { data: data as T, fromCache: false };
  } catch (e) {
    if (isNetworkError(e)) {
      const row = await db.cache.get(cacheKey);
      if (row) return { data: row.value as T, fromCache: true };
    }
    throw e;
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const row = await db.cache.get(key);
  return row ? (row.value as T) : null;
}

export async function setCache(key: string, value: unknown): Promise<void> {
  await db.cache.put({ key, value, updatedAt: Date.now() });
}

/** Register a Background Sync event with the service worker, if supported. */
export async function requestBackgroundSync(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as any).sync;
    if (sync?.register) {
      await sync.register('trackit-sync');
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Mutate via the network; if offline, enqueue the operation for later sync.
 * Returns the server response, or `{ offline: true }` when queued.
 */
export async function mutate(
  method: string,
  path: string,
  body?: unknown,
): Promise<any> {
  try {
    return await networkFetch(method, path, body);
  } catch (e) {
    if (isNetworkError(e)) {
      await db.pendingOps.add({
        method,
        url: path,
        body,
        updatedAt: Date.now(),
      });
      void requestBackgroundSync();
      return { offline: true };
    }
    throw e;
  }
}
