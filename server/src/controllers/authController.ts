import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User.js';
import { signToken } from '../utils/token.js';
import type { AuthedRequest } from '../middleware/auth.js';

function sanitize(user: any) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    settings: user.settings,
    createdAt: user.createdAt,
  };
}

export async function register(req: Request, res: Response) {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters' });
  }
  const normalized = email.toLowerCase();
  const exists = await UserModel.findOne({ email: normalized });
  if (exists) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await UserModel.create({
    email: normalized,
    passwordHash,
    name: name || '',
  });
  res
    .status(201)
    .json({ token: signToken(String(user._id)), user: sanitize(user) });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = await UserModel.findOne({ email: String(email).toLowerCase() });
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(String(user._id)), user: sanitize(user) });
}

export async function me(req: AuthedRequest, res: Response) {
  const user = await UserModel.findById(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({ user: sanitize(user) });
}

export async function updateMe(req: AuthedRequest, res: Response) {
  const patch: Record<string, any> = {};
  const { name, settings } = req.body || {};
  if (name !== undefined) patch.name = String(name).slice(0, 80);
  if (settings && typeof settings === 'object') {
    const s: Record<string, any> = {};
    if (settings.dailyGoal !== undefined) {
      s.dailyGoal = Math.max(0, Math.min(100, Number(settings.dailyGoal) || 0));
    }
    if (settings.remindersEnabled !== undefined) {
      s.remindersEnabled = !!settings.remindersEnabled;
    }
    if (Object.keys(s).length) patch.settings = s;
  }
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    { $set: patch },
    { new: true },
  );
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({ user: sanitize(user) });
}
