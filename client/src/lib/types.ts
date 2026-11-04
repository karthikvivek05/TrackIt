// A2Z / productivity shared types used across the client.

export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type ProblemStatus =
  | 'Not Started'
  | 'Solved';

export interface ProblemLink {
  practice?: string;
  youtube?: string;
  article?: string;
}

export interface Problem {
  slug: string;
  title: string;
  leetcodeNumber?: number;
  difficulty: Difficulty;
  links: ProblemLink;
  tags: string[];
}

export interface SubStep {
  slug: string;
  title: string;
  order: number;
  problems: Problem[];
}

export interface Step {
  slug: string;
  title: string;
  order: number;
  subSteps: SubStep[];
}

export interface Progress {
  _id?: string;
  problemSlug: string;
  status: ProblemStatus;
  starred: boolean;
  notes: string;
  solvedAt: string | null;
  lastRevisedAt: string | null;
  timeTakenMin: number | null;
  attempts: number;
  revisionCount: number;
  history: { status: ProblemStatus; at: string }[];
  updatedAt?: string;
}

export type TrackerType = 'habit' | 'counter' | 'duration' | 'checklist';

export interface Tracker {
  _id: string;
  name: string;
  icon: string;
  color: string;
  type: TrackerType;
  unit: string;
  createdAt?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  dueAt?: string | null;
}

export interface Entry {
  _id?: string;
  trackerId: string;
  date: string;
  value: boolean | number | ChecklistItem[] | null;
  note?: string;
  updatedAt?: string;
}
