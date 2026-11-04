import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { authRouter } from './routes/auth.js';
import { dsaRouter } from './routes/dsa.js';
import { trackersRouter } from './routes/trackers.js';
import { dataRouter } from './routes/data.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/dsa', dsaRouter);
app.use('/api/trackers', trackersRouter);
app.use('/api', dataRouter);

// Serve the built client in production.
const clientDist = path.resolve(
  fileURLToPath(new URL('../../client/dist', import.meta.url)),
);
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.use(notFound);
app.use(errorHandler);

async function main() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
