import type { Request, Response, NextFunction } from 'express';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[error]', err);
  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Duplicate value' });
  }
  const status = Number(err?.status) || 500;
  res.status(status).json({ error: err?.message || 'Server error' });
}
