import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useDSA, isDone } from '../hooks/useDSA';
import { useAuth } from '../context/AuthContext';
import { FullScreenSpinner, ErrorState } from '../components/ui';
import { buildHeatmap, computeStreaks, HEAT_LEVELS } from '../lib/stats';
import { todayKey } from '../lib/utils';
import { api } from '../lib/endpoints';
import type { ChecklistItem } from '../lib/types';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const DIFF_COLORS: Record<string, string> = {
  Easy: '#10b981',
  Medium: '#f59e0b',
  Hard: '#f43f5e',
};

const HEAT_COLORS = [
  '#e2e8f0',
  '#bbf7d0',
  '#86efac',
  '#4ade80',
  '#22c55e',
];

export default function Dashboard() {
  const { steps, progressMap, loading, error, reload, totalProblems, solvedCount } =
    useDSA();
  const { user } = useAuth();
  const goal = user?.settings?.dailyGoal ?? 2;
  const [todoItems, setTodoItems] = useState<ChecklistItem[]>([]);
  const [currentDay, setCurrentDay] = useState(() => todayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextDay = new Date(now);
      nextDay.setHours(24, 0, 0, 0);
      timer = setTimeout(() => {
        setCurrentDay(todayKey());
        scheduleMidnightRefresh();
      }, nextDay.getTime() - now.getTime() + 100);
    };
    scheduleMidnightRefresh();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadTodoItems = async () => {
      try {
        const res = await api.getEntriesByDate(currentDay);
        const checklist = res.data.items.find(
          (item) => item.tracker.type === 'checklist',
        );
        const value = checklist?.entry?.value;
        setTodoItems(
          Array.isArray(value)
            ? value.filter(
                (item): item is ChecklistItem =>
                  typeof item === 'object' &&
                  item !== null &&
                  'id' in item &&
                  'label' in item &&
                  'done' in item &&
                  typeof item.id === 'string' &&
                  typeof item.label === 'string' &&
                  typeof item.done === 'boolean',
              )
            : [],
        );
      } catch {
        setTodoItems([]);
      }
    };
    void loadTodoItems();
    window.addEventListener('today-checklist-updated', loadTodoItems);
    return () =>
      window.removeEventListener('today-checklist-updated', loadTodoItems);
  }, [currentDay]);

  const stats = useMemo(() => {
    const toLocalDay = (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value.slice(0, 10) : todayKey(date);
    };
    const countByDay = new Map<string, number>();
    const solvedProblemDays = new Set<string>();
    for (const p of Object.values(progressMap)) {
      const statusByDay = new Map<string, { status: string; at: string }>();
      for (const history of p.history) {
        if (!history.at) continue;
        const day = toLocalDay(history.at);
        const previous = statusByDay.get(day);
        if (!previous || new Date(history.at).getTime() >= new Date(previous.at).getTime()) {
          statusByDay.set(day, history);
        }
      }
      if (statusByDay.size === 0 && p.solvedAt) {
        const day = toLocalDay(p.solvedAt);
        statusByDay.set(day, { status: 'Solved', at: p.solvedAt });
      }
      for (const [day, history] of statusByDay) {
        if (history.status !== 'Solved') continue;
        const key = `${p.problemSlug}:${day}`;
        if (!solvedProblemDays.has(key)) {
          solvedProblemDays.add(key);
          countByDay.set(day, (countByDay.get(day) || 0) + 1);
        }
      }
    }
    const daySet = new Set(countByDay.keys());
    const { current, longest } = computeStreaks(daySet);
    const solvedToday = countByDay.get(currentDay) || 0;

    const diffSolved = { Easy: 0, Medium: 0, Hard: 0 };
    for (const step of steps) {
      for (const ss of step.subSteps) {
        for (const p of ss.problems) {
          diffSolved[p.difficulty] += isDone(progressMap[p.slug]?.status)
            ? 1
            : 0;
        }
      }
    }

    return {
      countByDay,
      current,
      longest,
      solvedToday,
      diffSolved,
    };
  }, [steps, progressMap, solvedCount, currentDay]);

  if (loading) return <FullScreenSpinner label="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pct = totalProblems ? Math.round((solvedCount / totalProblems) * 100) : 0;
  const heat = buildHeatmap(stats.countByDay);
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = user?.name || user?.email.split('@')[0] || 'there';

  // Group heat cells by week column.
  const weeks: { key: string; count: number; level: number }[][] = [];
  for (const cell of heat) {
    if (!weeks[cell.week]) weeks[cell.week] = [];
    weeks[cell.week][cell.day] = cell;
  }
  const monthLabels: { index: number; label: string }[] = [];
  weeks.forEach((week, i) => {
    if (!week[0]) return;
    const date = new Date(week[0].key + 'T00:00:00');
    if (date.getFullYear() !== new Date().getFullYear()) return;
    const m = date.toLocaleDateString(undefined, { month: 'short' });
    if (
      monthLabels.length === 0 ||
      monthLabels[monthLabels.length - 1].label !== m
    ) {
      monthLabels.push({ index: i, label: m });
    }
  });

  const diffData = (['Easy', 'Medium', 'Hard'] as const).map((d) => ({
    name: d,
    solved: stats.diffSolved[d],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {greeting}, {userName}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Overall"
          value={`${pct}%`}
          sub={`${solvedCount}/${totalProblems} solved`}
        />
        <StatCard label="Solved" value={solvedCount} />
        <StatCard label="Current streak" value={`${stats.current}d`} />
        <StatCard label="Longest streak" value={`${stats.longest}d`} />
        <StatCard
          label="Today"
          value={`${stats.solvedToday}/${goal}`}
          sub={stats.solvedToday >= goal ? 'Goal reached' : 'problems solved'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-semibold">Solved by difficulty</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diffData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="name" stroke="currentColor" fontSize={12} />
                <YAxis
                  allowDecimals={false}
                  domain={[0, totalProblems]}
                  stroke="currentColor"
                  fontSize={12}
                />
                <Tooltip cursor={{ fill: 'rgba(113,113,122,0.08)' }} />
                <Bar dataKey="solved" radius={[6, 6, 0, 0]}>
                  {diffData.map((d) => (
                    <Cell key={d.name} fill={DIFF_COLORS[d.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          {(() => {
            const completed = todoItems.filter((item) => item.done).length;
            const remaining = todoItems.length - completed;
            const progress = todoItems.length
              ? Math.round((completed / todoItems.length) * 100)
              : 0;
            return (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                      Today
                    </p>
                    <h2 className="mt-1 text-xl font-bold">TO-DO status</h2>
                  </div>
                  <div className="rounded-xl bg-brand-50 px-3 py-2 text-center dark:bg-slate-800">
                    <p className="text-2xl font-bold text-brand-700">
                      {completed}
                    </p>
                    <p className="text-[10px] font-medium uppercase text-slate-500">
                      done
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>{remaining} remaining</span>
                    <span>{progress}% complete</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {todoItems.length ? (
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {todoItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex min-w-0 items-center gap-2 text-sm"
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            item.done ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span
                          className={`truncate ${
                            item.done
                              ? 'text-slate-400 line-through'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No tasks added for today.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Activity</h2>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            Less
            {HEAT_LEVELS.map((c) => (
              <span key={c} className={`h-3 w-3 rounded-sm ${c}`} />
            ))}
            More
          </div>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="min-w-max">
            <div className="mb-1 flex gap-[3px]">
              {weeks.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 text-[9px] leading-none ${
                    monthLabels.some((m) => m.index === i) && i > 0
                      ? 'ml-1'
                      : ''
                  }`}
                >
                  {monthLabels.find((m) => m.index === i)?.label ?? ''}
                </div>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {weeks.map((week, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-[3px] ${
                    monthLabels.some((m) => m.index === i) && i > 0
                      ? 'ml-1'
                      : ''
                  }`}
                >
                  {Array.from({ length: 7 }).map((_, d) => {
                    const cell = week[d];
                    const isCurrentYear =
                      cell?.key.slice(0, 4) === String(new Date().getFullYear());
                    const weekMonth = week.find(
                      (weekCell) =>
                        weekCell?.key.slice(0, 4) ===
                        String(new Date().getFullYear()),
                    )?.key.slice(0, 7);
                    const isMonthBoundary =
                      Boolean(cell) &&
                      Boolean(weekMonth) &&
                      cell?.key.slice(0, 7) !== weekMonth;
                    return (
                      <div
                        key={d}
                        title={
                          cell && isCurrentYear && !isMonthBoundary
                            ? `${cell.key} · ${cell.count} solved`
                            : undefined
                        }
                        className={`h-3 w-3 rounded-sm ${
                          cell && isCurrentYear && !isMonthBoundary
                            ? HEAT_LEVELS[cell.level]
                            : 'bg-slate-100'
                        }`}
                        style={
                          cell && isCurrentYear && !isMonthBoundary
                            ? { backgroundColor: HEAT_COLORS[cell.level] }
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
