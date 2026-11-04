import { useEffect, useState } from 'react';
import type { Problem, Progress } from '../lib/types';
import type { ProblemStatus } from '../lib/types';
import {
  Button,
  StatusBadge,
  Textarea,
} from './ui';
import { X } from './icons';
import { STATUSES, classNames, difficultyColor, formatDate } from '../lib/utils';

interface Props {
  problem: Problem;
  stepTitle: string;
  subStepTitle: string;
  progress: Progress | undefined;
  onClose: () => void;
  onUpdate: (
    slug: string,
    patch: Partial<Progress> & { revise?: boolean },
  ) => void;
}

export default function ProblemDrawer({
  problem,
  stepTitle,
  subStepTitle,
  progress,
  onClose,
  onUpdate,
}: Props) {
  const [notes, setNotes] = useState(progress?.notes ?? '');

  useEffect(() => {
    setNotes(progress?.notes ?? '');
  }, [progress?.problemSlug, progress?.notes]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const status = progress?.status ?? 'Not Started';

  const setStatus = (s: ProblemStatus) => {
    onUpdate(problem.slug, { status: s });
  };

  const saveNotes = () => {
    onUpdate(problem.slug, { notes });
  };

  const hasLinks =
    problem.links.practice || problem.links.youtube || problem.links.article;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40"
      onClick={onClose}
      aria-label="Close problem details"
    >
      <aside
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div>
            <p className="text-xs text-slate-500">
              {stepTitle} · {subStepTitle}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold">
              {problem.leetcodeNumber && (
                <span className="mr-1.5 text-slate-400">
                  LC {problem.leetcodeNumber}:
                </span>
              )}
              {problem.title}
            </h2>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`text-sm font-medium ${difficultyColor(problem.difficulty)}`}
              >
                {problem.difficulty}
              </span>
              <StatusBadge status={status} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="tap rounded-md px-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-6 p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={classNames(
                    'tap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    status === s
                      ? 'bg-brand-600 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {hasLinks && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Links
              </h3>
              <div className="flex flex-wrap gap-2">
                {problem.links.practice && (
                  <a
                    href={problem.links.practice}
                    target="_blank"
                    rel="noreferrer"
                    className="tap rounded-md bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    Practice
                  </a>
                )}
                {problem.links.article && (
                  <a
                    href={problem.links.article}
                    target="_blank"
                    rel="noreferrer"
                    className="tap rounded-md bg-sky-100 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300"
                  >
                    Article
                  </a>
                )}
                {problem.links.youtube && (
                  <a
                    href={problem.links.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="tap rounded-md bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-300"
                  >
                    YouTube
                  </a>
                )}
              </div>
            </section>
          )}

          {problem.tags.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Notes <span className="font-normal text-slate-400">(Markdown)</span>
              </h3>
              <Button variant="subtle" onClick={saveNotes}>
                Save
              </Button>
            </div>
            <Textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={'# Approach\n- Step 1…\n- Step 2…'}
            />
          </section>

          {progress?.history?.length ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                History
              </h3>
              <ul className="space-y-1.5">
                {[...progress.history].reverse().map((h, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between text-sm"
                  >
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-slate-400">
                      {formatDate(h.at.slice(0, 10))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
