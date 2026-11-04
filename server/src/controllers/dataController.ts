import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth.js';
import { UserModel } from '../models/User.js';
import { ProgressModel } from '../models/Progress.js';
import { TrackerModel } from '../models/Tracker.js';
import { EntryModel } from '../models/Entry.js';

const STATUSES = ['Not Started', 'Solved'];
const TYPES = ['habit', 'counter', 'duration', 'checklist'];

export async function exportData(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const [user, progress, trackers, entries] = await Promise.all([
    UserModel.findById(userId).lean(),
    ProgressModel.find({ userId }).lean(),
    TrackerModel.find({ userId }).lean(),
    EntryModel.find({ userId }).lean(),
  ]);
  res.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    user: {
      email: user?.email,
      name: user?.name,
      settings: user?.settings,
    },
    progress,
    trackers,
    entries,
  });
}

export async function importData(req: AuthedRequest, res: Response) {
  const userId = req.userId!;
  const data = req.body?.data ?? req.body;
  if (!data || !Array.isArray(data.progress)) {
    return res.status(400).json({ error: 'Invalid export payload' });
  }

  if (data.user?.settings) {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { settings: data.user.settings } },
    );
  }

  await ProgressModel.deleteMany({ userId });
  await TrackerModel.deleteMany({ userId });
  await EntryModel.deleteMany({ userId });

  const idMap = new Map<string, string>();
  const trackers = Array.isArray(data.trackers) ? data.trackers : [];
  let trackerCount = 0;
  for (const t of trackers) {
    const created = await TrackerModel.create({
      userId,
      name: String(t?.name || 'Tracker'),
      icon: t?.icon || '',
      color: t?.color || '#52525b',
      type: TYPES.includes(t?.type) ? t.type : 'habit',
      unit: t?.unit || '',
    });
    idMap.set(String(t?._id), String(created._id));
    trackerCount += 1;
  }

  let progressCount = 0;
  if (data.progress.length) {
    const docs = data.progress.map((p: any) => ({
      userId,
      problemSlug: String(p.problemSlug),
      status:
        p.status === 'Needs Revision'
          ? 'Solved'
          : STATUSES.includes(p.status)
            ? p.status
            : 'Not Started',
      starred: !!p.starred,
      notes: String(p.notes || ''),
      solvedAt: p.solvedAt || null,
      lastRevisedAt: p.lastRevisedAt || null,
      timeTakenMin: p.timeTakenMin ?? null,
      attempts: Number(p.attempts) || 0,
      revisionCount: Number(p.revisionCount) || 0,
      history: Array.isArray(p.history) ? p.history : [],
    }));
    const inserted = await ProgressModel.insertMany(docs, { ordered: false });
    progressCount = inserted.length;
  }

  let entryCount = 0;
  if (Array.isArray(data.entries) && data.entries.length) {
    const docs = data.entries
      .map((e: any) => ({
        userId,
        trackerId: idMap.get(String(e.trackerId)) || null,
        date: String(e.date),
        value: e.value,
        note: String(e.note || ''),
      }))
      .filter((e: any) => e.trackerId);
    if (docs.length) {
      const inserted = await EntryModel.insertMany(docs, { ordered: false });
      entryCount = inserted.length;
    }
  }

  res.json({
    ok: true,
    imported: { trackers: trackerCount, progress: progressCount, entries: entryCount },
  });
}
