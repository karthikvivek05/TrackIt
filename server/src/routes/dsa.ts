import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getSheet,
  getProgress,
  updateProgress,
} from '../controllers/dsaController.js';

export const dsaRouter = Router();

dsaRouter.use(requireAuth);
dsaRouter.get('/sheet', asyncHandler(getSheet));
dsaRouter.get('/progress', asyncHandler(getProgress));
dsaRouter.patch('/progress/:problemSlug', asyncHandler(updateProgress));
