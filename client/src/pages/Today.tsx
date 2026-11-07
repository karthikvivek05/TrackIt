import { useEffect, useMemo, useRef, useState } from 'react';
import { useTrackers } from '../hooks/useTrackers';
import { api } from '../lib/endpoints';
import { getCache, setCache } from '../lib/api';
import {
  FullScreenSpinner,
  ErrorState,
  Button,
  Input,
} from '../components/ui';
import { Check, X } from '../components/icons';
import { todayKey } from '../lib/utils';
import type { Tracker, Entry, ChecklistItem } from '../lib/types';

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export default function Today() {
  const { trackers, loading, error, reload, create, update } = useTrackers();
  const [entryMap, setEntryMap] = useState<Record<string, Entry | null>>({});
  const [loadingEntries, setLoadingEntries] = useState(true);
  const createdDefault = useRef(false);
  const latestWriteAt = useRef(0);

  const today = todayKey();
  const checklist = useMemo(
    () => trackers.find((tracker) => tracker.type === 'checklist'),
    [trackers],
  );

  useEffect(() => {
    if (!loading && !checklist && !createdDefault.current) {
      createdDefault.current = true;
      void create({
        name: 'My Checklist',
        icon: '',
        color: '#10b981',
        type: 'checklist',
      });
    }
  }, [checklist, create, loading]);

  useEffect(() => {
    if (checklist && checklist.name !== 'Checklist') {
      void update(checklist._id, { name: 'Checklist' });
    }
  }, [checklist, update]);

  useEffect(() => {
    let cancelled = false;
    if (!checklist) {
      setLoadingEntries(false);
      return;
    }
    api
      .getEntriesByDate(today)
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, Entry | null> = {};
        const item = res.data.items.find((it) => it.tracker._id === checklist._id);
        if (item) map[checklist._id] = item.entry;
        setEntryMap(map);
      })
      .catch(async () => {
        const cached = await getCache<{
          items: { tracker: Tracker; entry: Entry | null }[];
        }>(`entriesByDate:${today}`);
        if (cached) {
          const map: Record<string, Entry | null> = {};
          for (const it of cached.items) map[it.tracker._id] = it.entry;
          setEntryMap(map);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEntries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [checklist, today]);

  useEffect(() => {
    if (!checklist) return;
    const items = [{ tracker: checklist, entry: entryMap[checklist._id] ?? null }];
    void setCache(`entriesByDate:${today}`, { date: today, items });
  }, [checklist, entryMap, today]);

  const setValue = (
    tracker: Tracker,
    value: boolean | number | ChecklistItem[] | null,
  ) => {
    if (!checklist) return;
    const updatedAt = Math.max(Date.now(), latestWriteAt.current + 1);
    latestWriteAt.current = updatedAt;
    const pendingCount = Array.isArray(value)
      ? value.filter((item) => !item.done).length
      : 0;
    setEntryMap((prev) => {
      const existing = prev[checklist._id];
      return {
        ...prev,
        [checklist._id]: {
          trackerId: checklist._id,
          date: today,
          value,
          note: existing?.note ?? '',
          _id: existing?._id,
        } as Entry,
      };
    });
    window.dispatchEvent(
      new CustomEvent('today-checklist-updated', {
        detail: { date: today, value, pendingCount },
      }),
    );
    void api
      .upsertEntry(checklist._id, today, { value, updatedAt })
      .then((res) => {
        const serverEntry = res?.entry as Entry | undefined;
        if (
          !serverEntry ||
          (serverEntry.clientUpdatedAt ?? updatedAt) < latestWriteAt.current
        ) {
          return;
        }
        setEntryMap((prev) => ({ ...prev, [checklist._id]: serverEntry }));
        window.dispatchEvent(
          new CustomEvent('today-checklist-updated', {
            detail: {
              date: today,
              value: serverEntry.value,
              pendingCount: Array.isArray(serverEntry.value)
                ? serverEntry.value.filter((item) => !item.done).length
                : 0,
            },
          }),
        );
      })
      .catch(() => {});
  };

  if (loading || loadingEntries) return <FullScreenSpinner label="Loading today…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {checklist && (
        <TrackerCard
          tracker={checklist}
          entry={entryMap[checklist._id] ?? null}
          onSetValue={(v) => setValue(checklist, v)}
        />
      )}
    </div>
  );
}

function TrackerCard({
  tracker,
  entry,
  onSetValue,
}: {
  tracker: Tracker;
  entry: Entry | null;
  onSetValue: (v: boolean | number | ChecklistItem[] | null) => void;
}) {
  const pending = tracker._id.startsWith('temp-');
  const value = entry?.value;

  return (
    <div className="max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <p className="text-xl font-semibold">TO-DO</p>
        {pending && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            syncing
          </span>
        )}
      </div>

      {pending ? (
        <p className="text-xs text-slate-400">
          Waiting to sync. Log entries after it syncs.
        </p>
      ) : (
        <ChecklistEditor
          items={(value as ChecklistItem[]) || []}
          onChange={(items) => onSetValue(items)}
        />
      )}
    </div>
  );
}

function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [label, setLabel] = useState('');
  const [newItemId, setNewItemId] = useState<string | null>(null);

  const add = () => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) return;
    const id = uid();
    onChange([
      ...items,
      { id, label: trimmedLabel, done: false },
    ]);
    setNewItemId(id);
    setLabel('');
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add item…"
        />
        <Button variant="subtle" className="px-5" onClick={add}>
          Add
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-slate-400">No items yet.</p>
      )}
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li
            key={it.id}
            className={`flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/60 ${
              it.id === newItemId ? 'checklist-item-enter' : ''
            }`}
          >
            <span className="relative flex h-6 w-6 shrink-0">
              <input
                type="checkbox"
                checked={it.done}
                onChange={() =>
                  onChange(
                    items.map((x, j) => (j === i ? { ...x, done: !x.done } : x)),
                  )
                }
                className="h-6 w-6 appearance-none rounded-md border-2 border-slate-300 bg-transparent checked:border-emerald-500 checked:bg-emerald-500 dark:border-slate-600 dark:bg-transparent dark:checked:border-emerald-500 dark:checked:bg-emerald-500"
              />
              {it.done && (
                <Check className="pointer-events-none absolute inset-0 h-6 w-6 p-1 text-white" />
              )}
            </span>
            <span
              className={`flex-1 text-base ${it.done ? 'text-slate-400 line-through' : ''}`}
            >
              {it.label}
            </span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="tap px-1 text-slate-400 hover:text-rose-500"
              aria-label="Remove item"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
