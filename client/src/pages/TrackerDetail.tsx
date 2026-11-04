import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useTrackers } from '../hooks/useTrackers';
import { api } from '../lib/endpoints';
import { getCache } from '../lib/api';
import { FullScreenSpinner, ErrorState, Button } from '../components/ui';
import { ChevronLeft, ChevronRight } from '../components/icons';
import {
  trackerStreak,
  totalFor,
  numericValue,
  entryIsComplete,
} from '../lib/trackerUtils';
import { classNames, formatMinutes, lastNDays, todayKey } from '../lib/utils';
import type { Entry, Tracker } from '../lib/types';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function monthCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  return cells;
}

function scoreFor(tracker: Tracker, entry: Entry | null | undefined): number {
  if (!entry) return 0;
  if (tracker.type === 'habit') return entry.value === true ? 1 : 0;
  if (tracker.type === 'counter' || tracker.type === 'duration') {
    return numericValue(entry);
  }
  if (tracker.type === 'checklist') {
    const v = entry.value as { done: boolean }[] | null;
    if (!v || v.length === 0) return 0;
    const done = v.filter((i) => i.done).length;
    return done / v.length;
  }
  return 0;
}

export default function TrackerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { trackers, loading, update, remove } = useTrackers();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const tracker = trackers.find((t) => t._id === id);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingEntries(true);
    api
      .getTrackerEntries(id)
      .then((res) => {
        if (!cancelled) setEntries(res.data.entries);
      })
      .catch(async () => {
        const cached = await getCache<{ entries: Entry[] }>(`entries:${id}`);
        if (cached && !cancelled) setEntries(cached.entries);
      })
      .finally(() => {
        if (!cancelled) setLoadingEntries(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const chartData = useMemo(() => {
    if (!tracker) return [];
    const map = new Map(entries.map((e) => [e.date, e]));
    return lastNDays(30).map((key) => ({
      label: new Date(key + 'T00:00:00').toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      }),
      value: scoreFor(tracker, map.get(key)),
    }));
  }, [entries, tracker]);

  if (loading || loadingEntries) return <FullScreenSpinner label="Loading tracker…" />;
  if (!tracker) {
    return (
      <ErrorState
        message="Tracker not found."
        onRetry={() => navigate('/today')}
      />
    );
  }

  const streak = trackerStreak(tracker, entries);
  const total = totalFor(tracker, entries);

  const totalLabel =
    tracker.type === 'duration'
      ? formatMinutes(total)
      : tracker.type === 'habit' || tracker.type === 'checklist'
        ? `${total} days`
        : `${total} ${tracker.unit || ''}`.trim();

  const cells = monthCells(month.year, month.month);
  const entryByDay = new Map(entries.map((e) => [e.date, e]));
  const maxScore = Math.max(
    1,
    ...entries.map((e) => scoreFor(tracker, e)),
  );

  const prevMonth = () =>
    setMonth((m) =>
      m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 },
    );
  const nextMonth = () =>
    setMonth((m) =>
      m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 },
    );

  const monthTitle = new Date(month.year, month.month, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold"
            style={{ backgroundColor: `${tracker.color}22`, color: tracker.color }}
          >
            {tracker.name.trim().charAt(0).toUpperCase() || '?'}
          </span>
          <div>
            <h1 className="text-2xl font-bold">{tracker.name}</h1>
            <p className="text-sm capitalize text-slate-500">
              {tracker.type}
              {tracker.unit ? ` · ${tracker.unit}` : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/today"
            className="tap inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          >
            <ChevronLeft className="h-4 w-4" />
            Today
          </Link>
          <Button
            variant="danger"
            onClick={() => {
              if (confirm('Delete this tracker and all its entries?')) {
                remove(tracker._id);
                navigate('/today');
              }
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Current streak" value={`${streak.current}d`} />
        <SummaryCard label="Longest streak" value={`${streak.longest}d`} />
        <SummaryCard label="Total" value={totalLabel} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 font-semibold">Last 30 days</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trackerFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tracker.color} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={tracker.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="currentColor" fontSize={10} interval={4} />
              <YAxis stroke="currentColor" fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke={tracker.color}
                strokeWidth={2}
                fill="url(#trackerFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Calendar</h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="tap inline-flex items-center justify-center rounded-md bg-slate-100 p-1.5 dark:bg-slate-800" aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">{monthTitle}</span>
            <button onClick={nextMonth} className="tap inline-flex items-center justify-center rounded-md bg-slate-100 p-1.5 dark:bg-slate-800" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const key = `${month.year}-${String(month.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const entry = entryByDay.get(key);
            const score = entry ? scoreFor(tracker, entry) : 0;
            const intensity = score === 0 ? 0 : Math.max(0.15, score / maxScore);
            const isToday = key === todayKey();
            return (
              <div
                key={key}
                title={entry ? `${key} · ${scoreFor(tracker, entry)}` : key}
                className={classNames(
                  'tap flex aspect-square items-center justify-center rounded-md text-xs font-medium',
                  isToday && 'ring-2 ring-brand-500',
                )}
                style={{
                  backgroundColor:
                    intensity > 0 ? `${tracker.color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` : undefined,
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
