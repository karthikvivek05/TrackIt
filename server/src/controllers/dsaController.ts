import type { Request, Response } from 'express';
import { StepModel } from '../models/Step.js';
import { ProgressModel } from '../models/Progress.js';
import type { AuthedRequest } from '../middleware/auth.js';

const STATUSES = ['Not Started', 'Solved'];

export async function getSheet(_req: Request, res: Response) {
  const steps = await StepModel.find().sort({ order: 1 }).lean();
  res.json({ steps });
}

export async function getProgress(req: AuthedRequest, res: Response) {
  const progress = await ProgressModel.find({ userId: req.userId }).lean();
  res.json({
    progress: progress.map((item) => {
      const storedStatus = String(item.status);
      return {
        ...item,
        status:
        storedStatus === 'Needs Revision'
          ? 'Solved'
          : storedStatus === 'In Progress'
            ? 'Not Started'
            : storedStatus,
      solvedAt:
        storedStatus === 'Needs Revision' && !item.solvedAt
          ? item.updatedAt
          : item.solvedAt,
      };
    }),
  });
}

export async function updateProgress(req: AuthedRequest, res: Response) {
  const { problemSlug } = req.params;
  const body = req.body || {};
  const userId = req.userId!;

  const clientTs = Number(body.updatedAt) || Date.now();
  const existing = await ProgressModel.findOne({ userId, problemSlug });

  // Latest-change-wins: ignore stale offline writes.
  if (existing?.updatedAt && existing.updatedAt.getTime() > clientTs) {
    return res.json({ progress: existing, ignored: true });
  }

  const patch: Record<string, any> = {};
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    patch.status = body.status;
  }
  if (body.starred !== undefined) patch.starred = !!body.starred;
  if (body.notes !== undefined) patch.notes = String(body.notes);
  if (body.timeTakenMin !== undefined) {
    patch.timeTakenMin =
      body.timeTakenMin === null || body.timeTakenMin === ''
        ? null
        : Number(body.timeTakenMin);
  }
  if (body.attempts !== undefined) patch.attempts = Number(body.attempts) || 0;
  if (body.solvedAt !== undefined) {
    patch.solvedAt = body.solvedAt ? new Date(body.solvedAt) : null;
  }
  if (body.lastRevisedAt !== undefined) {
    patch.lastRevisedAt = body.lastRevisedAt
      ? new Date(body.lastRevisedAt)
      : null;
  }

  const revise = body.revise === true;

  let doc;
  if (!existing) {
    const status = patch.status || 'Not Started';
    doc = new ProgressModel({
      userId,
      problemSlug,
      status,
      starred: patch.starred ?? false,
      notes: patch.notes ?? '',
      attempts: patch.attempts ?? (status === 'Solved' ? 1 : 0),
      solvedAt: patch.solvedAt ?? (status === 'Solved' ? new Date() : null),
      timeTakenMin: patch.timeTakenMin ?? null,
      revisionCount: 0,
      history: [{ status, at: new Date() }],
    });
  } else {
    const storedStatus = String(existing.status);
    if (storedStatus === 'Needs Revision') {
      existing.status = 'Solved';
      if (!existing.solvedAt) existing.solvedAt = existing.updatedAt || new Date();
    } else if (storedStatus === 'In Progress') {
      existing.status = 'Not Started';
    }
    const prevStatus = existing.status;
    doc = existing;
    Object.assign(doc, patch);
    if (patch.status && patch.status !== prevStatus) {
      doc.history.push({ status: patch.status, at: new Date() });
    }
    if (doc.status === 'Solved' && !doc.solvedAt) {
      doc.solvedAt = patch.solvedAt || new Date();
    }
    if (doc.status === 'Solved' && doc.attempts < 1) doc.attempts = 1;
  }

  if (revise) {
    doc.revisionCount = (doc.revisionCount || 0) + 1;
    doc.lastRevisedAt = new Date();
  }

  await doc.save();
  res.json({ progress: doc });
}
