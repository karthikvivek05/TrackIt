import { db } from './db';
import { networkFetch } from './api';

export interface SyncResult {
  remaining: number;
  ok: boolean;
}

/** Replay queued operations in order. Stops on the first failure. */
export async function syncPending(): Promise<SyncResult> {
  const ops = await db.pendingOps.orderBy('updatedAt').toArray();
  for (const op of ops) {
    try {
      await networkFetch(op.method, op.url, op.body);
      await db.pendingOps.delete(op.id!);
    } catch {
      break;
    }
  }
  const remaining = await db.pendingOps.count();
  return { remaining, ok: remaining === 0 };
}

/** Listen for 'TRACKIT_SYNC' messages dispatched by the service worker. */
export function listenForSyncMessages(handler: () => void): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'TRACKIT_SYNC') handler();
  };
  navigator.serviceWorker?.addEventListener('message', onMessage);
  return () =>
    navigator.serviceWorker?.removeEventListener('message', onMessage);
}
