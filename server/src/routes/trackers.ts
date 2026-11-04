import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  listTrackers,
  createTracker,
  updateTracker,
  deleteTracker,
  listTrackerEntries,
  listEntriesByDate,
  upsertEntry,
} from '../controllers/trackersController.js';

export const trackersRouter = Router();

trackersRouter.use(requireAuth);
trackersRouter.get('/', asyncHandler(listTrackers));
trackersRouter.post('/', asyncHandler(createTracker));
trackersRouter.get('/entries', asyncHandler(listEntriesByDate));
trackersRouter.get('/:id/entries', asyncHandler(listTrackerEntries));
trackersRouter.put('/:id/entries/:date', asyncHandler(upsertEntry));
trackersRouter.patch('/:id', asyncHandler(updateTracker));
trackersRouter.delete('/:id', asyncHandler(deleteTracker));
