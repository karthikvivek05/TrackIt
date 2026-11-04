import { useEffect, useMemo, useState } from 'react';
import { useDSA, isDone } from '../hooks/useDSA';
import { FullScreenSpinner, ErrorState, ProgressBar } from '../components/ui';
import ProblemDrawer from '../components/ProblemDrawer';
import { ChevronRight, Check, Star, StarFilled } from '../components/icons';
import { classNames, difficultyColor } from '../lib/utils';
import type { Problem, Step, SubStep } from '../lib/types';

interface ProblemRef {
  problem: Problem;
  step: Step;
  subStep: SubStep;
}

function countProblems(
  subSteps: SubStep[],
  getStatus: (slug: string) => string | undefined,
) {
  let total = 0;
  let done = 0;
  for (const ss of subSteps) {
    for (const p of ss.problems) {
      total += 1;
      if (isDone(getStatus(p.slug))) done += 1;
    }
  }
  return { total, done };
}

export default function DSATracker() {
  const {
    steps,
    progressMap,
    loading,
    error,
    fromCache,
    reload,
    totalProblems,
    solvedCount,
    updateProblem,
  } = useDSA();

  const [search, setSearch] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [expandedSubSteps, setExpandedSubSteps] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<ProblemRef | null>(null);

  useEffect(() => {
    setExpandedSteps(new Set());
  }, [steps]);

  const getStatus = (slug: string) => progressMap[slug]?.status;

  const filteredSteps = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result: Step[] = [];
    for (const step of steps) {
      const subSteps: SubStep[] = [];
      for (const ss of step.subSteps) {
        const problems = ss.problems.filter((p) => {
          if (
            q &&
            !(
              p.title.toLowerCase().includes(q) ||
              p.tags.some((t) => t.toLowerCase().includes(q))
            )
          ) {
            return false;
          }
          return true;
        });
        if (problems.length) subSteps.push({ ...ss, problems });
      }
      if (subSteps.length) result.push({ ...step, subSteps });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, progressMap, search]);

  const toggleSet = (set: Set<string>, v: string): Set<string> => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const toggleSolved = (slug: string) => {
    const done = isDone(progressMap[slug]?.status);
    if (done) {
      updateProblem(slug, { status: 'Not Started' });
    } else {
      updateProblem(slug, {
        status: 'Solved',
        attempts: (progressMap[slug]?.attempts ?? 0) + 1,
      });
    }
  };

  const toggleStar = (slug: string) => {
    updateProblem(slug, { starred: !progressMap[slug]?.starred });
  };

  if (loading) return <FullScreenSpinner label="Loading A2Z sheet…" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pct = totalProblems ? Math.round((solvedCount / totalProblems) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Striver A2Z Sheet</h1>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>
            {solvedCount}/{totalProblems} solved
          </span>
          <ProgressBar value={pct} className="w-28" />
        </div>
      </div>

      {fromCache && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          You're viewing cached data. Changes will sync when you're back online.
        </p>
      )}

      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search problems or tags…"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setExpandedSteps(new Set())}
            className="tap rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Collapse all
          </button>
        </div>
      </div>

      {filteredSteps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
          No problems match your filters.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredSteps.map((step) => {
            const sc = countProblems(step.subSteps, getStatus);
            const expanded = expandedSteps.has(step.slug);
            return (
              <div
                key={step.slug}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  onClick={() => setExpandedSteps(toggleSet(expandedSteps, step.slug))}
                  className="tap grid w-full grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:grid-cols-[auto,minmax(0,1fr),8rem,3.5rem]"
                >
                  <span
                    className={classNames(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform dark:bg-slate-800 dark:text-slate-400',
                      expanded && 'rotate-90',
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-800 dark:text-slate-100">
                      {step.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-400">
                      {sc.done} of {sc.total} complete
                    </span>
                  </span>
                  <ProgressBar
                    value={sc.total ? (sc.done / sc.total) * 100 : 0}
                    className="hidden w-full sm:block"
                  />
                  <span className="w-14 rounded-full bg-slate-100 px-2 py-1 text-center text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    {sc.total ? Math.round((sc.done / sc.total) * 100) : 0}%
                  </span>
                </button>

                {expanded && (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                    {step.subSteps.map((ss) => {
                      const ssc = countProblems([ss], getStatus);
                      const ssExpanded = expandedSubSteps.has(ss.slug);
                      return (
                        <div key={ss.slug}>
                          <button
                            onClick={() =>
                              setExpandedSubSteps(toggleSet(expandedSubSteps, ss.slug))
                            }
                            className="tap grid w-full min-w-0 grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 sm:grid-cols-[auto,minmax(0,1fr),6rem,3rem]"
                          >
                            <span
                              className={classNames(
                                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition-transform dark:bg-slate-800',
                                ssExpanded && 'rotate-90',
                              )}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {ss.title}
                              </span>
                              <span className="block whitespace-nowrap text-xs text-slate-400">
                                {ssc.done} of {ssc.total} complete
                              </span>
                            </span>
                            <ProgressBar
                              value={ssc.total ? (ssc.done / ssc.total) * 100 : 0}
                              className="hidden w-full sm:block"
                              color="bg-emerald-500"
                            />
                            <span className="w-12 whitespace-nowrap text-center text-xs font-semibold text-slate-400">
                              {ssc.total ? Math.round((ssc.done / ssc.total) * 100) : 0}%
                            </span>
                          </button>

                          {ssExpanded && (
                            <ul className="ml-5 space-y-1 border-l-2 border-brand-200 pl-3 dark:border-slate-700">
                              {ss.problems.map((p) => {
                                const status = getStatus(p.slug) ?? 'Not Started';
                                const done = isDone(status);
                                return (
                                  <li
                                    key={p.slug}
                                    className="group flex items-center gap-2 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-slate-200 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-900"
                                  >
                                    <button
                                      onClick={() => toggleSolved(p.slug)}
                                      aria-label={
                                        done ? 'Mark not started' : 'Mark solved'
                                      }
                                      className="tap flex h-6 w-6 shrink-0 items-center justify-center"
                                    >
                                      <span
                                        className={classNames(
                                          'flex h-5 w-5 items-center justify-center rounded-full border-2 text-[11px] font-bold transition-colors',
                                          done
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-slate-300 text-transparent hover:border-emerald-400 dark:border-slate-600',
                                        )}
                                      >
                                        <Check className="h-3 w-3" />
                                      </span>
                                    </button>

                                    <button
                                      onClick={() =>
                                        setSelected({ problem: p, step, subStep: ss })
                                      }
                                      className="min-w-0 flex-1 truncate text-left text-sm text-slate-800 dark:text-slate-100"
                                    >
                                      {p.leetcodeNumber && (
                                        <span className="mr-1.5 font-medium text-slate-400">
                                          LC {p.leetcodeNumber}:
                                        </span>
                                      )}
                                      {p.title}
                                    </button>

                                    <span
                                      className={`hidden text-xs font-medium sm:inline ${difficultyColor(p.difficulty)}`}
                                    >
                                      {p.difficulty}
                                    </span>

                                    {progressMap[p.slug]?.starred && (
                                      <StarFilled className="h-3.5 w-3.5 text-amber-400" />
                                    )}

                                    <button
                                      onClick={() => toggleStar(p.slug)}
                                      aria-label="Toggle star"
                                      className={classNames(
                                        'tap rounded-md px-1.5 text-sm',
                                        progressMap[p.slug]?.starred
                                          ? 'text-amber-400'
                                          : 'text-slate-300 opacity-0 hover:text-amber-300 group-hover:opacity-100 dark:text-slate-600',
                                      )}
                                    >
                                      {progressMap[p.slug]?.starred ? (
                                        <StarFilled className="h-4 w-4" />
                                      ) : (
                                        <Star className="h-4 w-4" />
                                      )}
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
