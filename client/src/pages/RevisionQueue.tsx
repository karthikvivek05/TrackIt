import { useMemo, useState } from 'react';
import { useDSA } from '../hooks/useDSA';
import { FullScreenSpinner, ErrorState, EmptyState, Button } from '../components/ui';
import ProblemDrawer from '../components/ProblemDrawer';
import { addDays, todayKey, formatDate, difficultyColor } from '../lib/utils';
import type { Problem, Progress, Step, SubStep } from '../lib/types';

const INTERVALS = [3, 7, 21];

interface DueItem {
  problem: Problem;
  step: Step;
  subStep: SubStep;
  progress: Progress;
  dueDate: string;
  overdueDays: number;
}

export default function RevisionQueue() {
  const { steps, progressMap, loading, error, reload, updateProblem } =
    useDSA();
  const [selected, setSelected] = useState<DueItem | null>(null);

  const { due, upcoming } = useMemo(() => {
    const today = todayKey();
    const dueList: DueItem[] = [];
    const upcomingList: DueItem[] = [];
    for (const step of steps) {
      for (const subStep of step.subSteps) {
        for (const problem of subStep.problems) {
          const p = progressMap[problem.slug];
          if (!p) continue;

          let dueDate: string | null = null;
          if (p.status === 'Solved' && (p.revisionCount || 0) < INTERVALS.length) {
            const base = p.lastRevisedAt || p.solvedAt;
            if (base) {
              dueDate = addDays(base.slice(0, 10), INTERVALS[p.revisionCount || 0]);
            }
          }
          if (!dueDate) continue;

          const item: DueItem = {
            problem,
            step,
            subStep,
            progress: p,
            dueDate,
            overdueDays: Math.round(
              (new Date(today).getTime() - new Date(dueDate).getTime()) / 86400000,
            ),
          };
          if (dueDate <= today) dueList.push(item);
          else if (dueDate <= addDays(today, 7)) upcomingList.push(item);
        }
      }
    }
    dueList.sort((a, b) => b.overdueDays - a.overdueDays);
    upcomingList.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return { due: dueList, upcoming: upcomingList };
  }, [steps, progressMap]);

  if (loading) return <FullScreenSpinner label="Loading revision queue…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const markRevised = (slug: string) => {
    updateProblem(slug, { revise: true, status: 'Solved' });
  };

  const renderRow = (item: DueItem) => (
    <li
      key={item.problem.slug}
      className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
    >
      <button
        onClick={() => setSelected(item)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span className={`min-w-0 truncate text-sm font-medium ${difficultyColor(item.problem.difficulty)}`}>
          {item.problem.title}
        </span>
        <span className="hidden text-xs text-slate-400 sm:inline">
          {item.step.title} · {item.subStep.title}
        </span>
      </button>
      <span className="text-xs text-slate-400">{formatDate(item.dueDate)}</span>
      <Button variant="subtle" onClick={() => markRevised(item.problem.slug)}>
        Mark revised
      </Button>
    </li>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Revision Queue</h1>
      <p className="text-sm text-slate-500">
        Solved problems resurface after {INTERVALS.join(', ')} days. Mark a
        problem revised to advance it to the next interval (three revisions =
        mastered).
      </p>

      <section>
        <h2 className="mb-2 font-semibold">
          Due now{' '}
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            {due.length}
          </span>
        </h2>
        {due.length === 0 ? (
          <EmptyState
            title="Nothing due right now"
            hint="Solve a few problems and they'll show up here for spaced revision."
          />
        ) : (
          <ul className="space-y-2">{due.map(renderRow)}</ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Coming up (next 7 days)</h2>
          <ul className="space-y-2">{upcoming.map(renderRow)}</ul>
        </section>
      )}

      {selected && (
        <ProblemDrawer
          problem={selected.problem}
          stepTitle={selected.step.title}
          subStepTitle={selected.subStep.title}
          progress={progressMap[selected.problem.slug]}
          onClose={() => setSelected(null)}
          onUpdate={updateProblem}
        />
      )}
    </div>
  );
}
