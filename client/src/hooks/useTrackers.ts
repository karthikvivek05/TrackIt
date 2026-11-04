import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/endpoints';
import { getCache, setCache } from '../lib/api';
import type { Tracker } from '../lib/types';

export function useTrackers() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTrackers();
      setTrackers(res.data.trackers);
      setFromCache(res.fromCache);
    } catch {
      const cached = await getCache<{ trackers: Tracker[] }>('trackers');
      if (cached) {
        setTrackers(cached.trackers);
        setFromCache(true);
      } else {
        setError('Unable to load trackers');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void setCache('trackers', { trackers });
  }, [trackers]);

  const create = useCallback(
    async (payload: {
      name: string;
      icon: string;
      color: string;
      type: string;
      unit?: string;
    }) => {
      const temp: Tracker = {
        _id: `temp-${Date.now()}`,
        name: payload.name,
        icon: payload.icon,
        color: payload.color,
        type: payload.type as Tracker['type'],
        unit: payload.unit || '',
      };
      setTrackers((prev) => [...prev, temp]);
      try {
        const res = await api.createTracker(payload);
        const real: Tracker = res?.tracker;
        if (real) {
          setTrackers((prev) => prev.map((t) => (t._id === temp._id ? real : t)));
        }
        return real;
      } catch {
        /* offline: temp tracker stays; entries disabled until synced */
        return temp;
      }
    },
    [],
  );

  const update = useCallback(async (id: string, payload: Partial<Tracker>) => {
    setTrackers((prev) => prev.map((t) => (t._id === id ? { ...t, ...payload } : t)));
    try {
      await api.updateTracker(id, payload);
    } catch {
      /* offline queued */
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setTrackers((prev) => prev.filter((t) => t._id !== id));
    try {
      await api.deleteTracker(id);
    } catch {
      /* offline queued */
    }
  }, []);

  return { trackers, loading, error, fromCache, reload: load, create, update, remove };
}
