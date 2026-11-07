import type { Response } from 'express';
import { TrackerModel } from '../models/Tracker.js';
import { EntryModel } from '../models/Entry.js';
import type { AuthedRequest } from '../middleware/auth.js';

const TRACKER_TYPES = ['habit', 'counter', 'duration', 'checklist'];

export async function listTrackers(req: AuthedRequest, res: Response) {
  const trackers = await TrackerModel.find({ userId: req.userId }).sort({
    createdAt: 1,
  });
  res.json({ trackers });
}

export async function createTracker(req: AuthedRequest, res: Response) {
  const { name, icon, color, type, unit } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (!TRACKER_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid tracker type' });
  }
  const tracker = await TrackerModel.create({
    userId: req.userId,
    name: String(name).trim(),
    icon: icon || '',
    color: color || '#52525b',
    type,
    unit: unit || '',
  });
  res.status(201).json({ tracker });
}

export async function updateTracker(req: AuthedRequest, res: Response) {
  const patch: Record<string, any> = {};
  const { name, icon, color, unit } = req.body || {};
  if (name !== undefined) patch.name = String(name).trim();
  if (icon !== undefined) patch.icon = String(icon);
  if (color !== undefined) patch.color = String(color);
  if (unit !== undefined) patch.unit = String(unit);
  const tracker = await TrackerModel.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $set: patch },
    { new: true },
  );
  if (!tracker) {
    return res.status(404).json({ error: 'Tracker not found' });
  }
  res.json({ tracker });
}

export async function deleteTracker(req: AuthedRequest, res: Response) {
  const tracker = await TrackerModel.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });
  if (!tracker) {
    return res.status(404).json({ error: 'Tracker not found' });
  }
  await EntryModel.deleteMany({ trackerId: tracker._id, userId: req.userId });
  res.json({ ok: true });
}

export async function listTrackerEntries(req: AuthedRequest, res: Response) {
  const filter: Record<string, any> = {
    trackerId: req.params.id,
    userId: req.userId,
  };
  const { from, to } = req.query;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = String(from);
    if (to) filter.date.$lte = String(to);
  }
  const entries = await EntryModel.find(filter).sort({ date: 1 });
  res.json({ entries });
}

export async function listEntriesByDate(req: AuthedRequest, res: Response) {
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date (YYYY-MM-DD)' });
  }
  const trackers = await TrackerModel.find({ userId: req.userId }).sort({
    createdAt: 1,
  });
  const entries = await EntryModel.find({ userId: req.userId, date });
  const byTracker = new Map(entries.map((e) => [String(e.trackerId), e]));
  const items = trackers.map((t) => ({
    tracker: t,
    entry: byTracker.get(String(t._id)) || null,
  }));
  res.json({ date, items });
}

export async function upsertEntry(req: AuthedRequest, res: Response) {
  const { id, date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date (YYYY-MM-DD)' });
  }
  const tracker = await TrackerModel.findOne({ _id: id, userId: req.userId });
  if (!tracker) {
    return res.status(404).json({ error: 'Tracker not found' });
  }

  const body = req.body || {};
  const clientTs = Number(body.updatedAt) || Date.now();
  let value = body.value;

  if (tracker.type === 'habit') value = value === true;
  else if (tracker.type === 'counter' || tracker.type === 'duration') {
    value = value === null || value === undefined ? 0 : Math.max(0, Number(value) || 0);
  } else if (tracker.type === 'checklist') {
    if (!Array.isArray(value)) {
      return res.status(400).json({ error: 'Checklist value must be an array' });
    }
    value = value.map((it: any, i: number) => ({
      id: String(it?.id ?? i),
      label: String(it?.label ?? ''),
      done: !!it?.done,
      dueAt: it?.dueAt || null,
    }));
  }

  const existing = await EntryModel.findOne({
    userId: req.userId,
    trackerId: tracker._id,
    date,
  });

  if (
    existing &&
    existing.clientUpdatedAt > 0 &&
    existing.clientUpdatedAt > clientTs
  ) {
    return res.json({ entry: existing, ignored: true });
  }

  const note = body.note !== undefined ? String(body.note) : existing?.note ?? '';

  let entry;
  if (!existing) {
    entry = new EntryModel({
      userId: req.userId,
      trackerId: tracker._id,
      date,
      value,
      note,
    });
  } else {
    existing.value = value;
    existing.note = note;
    existing.clientUpdatedAt = clientTs;
    entry = existing;
  }
  if (!existing) entry.clientUpdatedAt = clientTs;
  await entry.save();
  res.json({ entry });
}
