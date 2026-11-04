import Dexie, { type Table } from 'dexie';

export interface PendingOp {
  id?: number;
  method: string;
  url: string;
  body?: unknown;
  updatedAt: number;
}

export interface CacheRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

class TrackItDB extends Dexie {
  pendingOps!: Table<PendingOp, number>;
  cache!: Table<CacheRow, string>;

  constructor() {
    super('trackit');
    this.version(1).stores({
      pendingOps: '++id, updatedAt',
      cache: 'key',
    });
  }
}

export const db = new TrackItDB();
