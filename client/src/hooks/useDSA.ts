import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/endpoints';
import { getCache, setCache } from '../lib/api';
import type { Step, SubStep, Problem, Progress } from '../lib/types';

export function isDone(status: string | undefined): boolean {
  return status === 'Solved';
}

export interface ProblemRef {
  problem: Problem;
  step: Step;
  subStep: SubStep;
}

export function useDSA() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sheetRes, progRes] = await Promise.all([
        api.getSheet(),
        api.getProgress(),
      ]);
      setSteps(sheetRes.data.steps);
      const map: Record<string, Progress> = {};
      for (const p of progRes.data.progress) map[p.problemSlug] = p;
      setProgressMap(map);
      setFromCache(sheetRes.fromCache || progRes.fromCache);
    } catch {
      const [sheet, prog] = await Promise.all([
        getCache<{ steps: Step[] }>('a2z-sheet'),
        getCache<{ progress: Progress[] }>('progress'),
      ]);
      if (sheet || prog) {
        setSteps(sheet?.steps ?? []);
        const map: Record<string, Progress> = {};
        for (const p of prog?.progress ?? []) map[p.problemSlug] = p;
        setProgressMap(map);
        setFromCache(true);
      } else {
        setError(
          'Unable to load the A2Z sheet. Connect to the internet once so it can be cached offline.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the offline cache in sync with in-memory progress.
  useEffect(() => {
    if (Object.keys(progressMap).length) {
      void setCache('progress', { progress: Object.values(progressMap) });
    }
  }, [progressMap]);

  const problemIndex = useMemo(() => {
    const map = new Map<string, ProblemRef>();
    for (const step of steps) {
      for (const subStep of step.subSteps) {
        for (const problem of subStep.problems) {
          map.set(problem.slug, { problem, step, subStep });
        }
      }
    }
    return map;
  }, [steps]);

  const updateProblem = useCallback(
    async (
      slug: string,
      patch: Partial<Progress> & { revise?: boolean },
    ) => {
      const updatedAt = Date.now();
      setProgressMap((prev) => {
        const existing: Progress = prev[slug] ?? {
          problemSlug: slug,
          status: 'Not Started',
          starred: false,
          notes: '',
          solvedAt: null,
          lastRevisedAt: null,
          timeTakenMin: null,
          attempts: 0,
          revisionCount: 0,
          history: [],
        };
        const next: Progress = { ...existing, ...patch };
        if (patch.status === 'Solved' && !next.solvedAt) {
          next.solvedAt = new Date().toISOString();
        }
        if (patch.status === 'Not Started') {
          next.solvedAt = null;
        }
        if (patch.status && patch.status !== existing.status) {
          next.history = [
            ...existing.history,
            { status: patch.status, at: new Date().toISOString() },
          ];
        }
        if (patch.revise) {
          next.revisionCount = (next.revisionCount || 0) + 1;
          next.lastRevisedAt = new Date().toISOString();
        }
        return { ...prev, [slug]: next };
      });

      try {
        await api.updateProgress(slug, { ...patch, updatedAt } as any);
      } catch {
        /* offline handled by queue; optimistic state already applied */
      }
    },
    [],
  );

  const totalProblems = useMemo(
    () =>
      steps.reduce(
        (n, s) =>
          n + s.subSteps.reduce((m, ss) => m + ss.problems.length, 0),
        0,
      ),
    [steps],
  );

  const solvedCount = useMemo(
    () =>
      steps.reduce(
        (n, s) =>
          n +
          s.subSteps.reduce(
            (m, ss) =>
              m +
              ss.problems.filter((p) => isDone(progressMap[p.slug]?.status))
                .length,
            0,
          ),
        0,
      ),
    [steps, progressMap],
  );

  return {
    steps,
    progressMap,
    problemIndex,
    loading,
    error,
    fromCache,
    totalProblems,
    solvedCount,
    reload: load,
    updateProblem,
  };
}
