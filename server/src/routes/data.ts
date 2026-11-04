import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { exportData, importData } from '../controllers/dataController.js';

export const dataRouter = Router();

dataRouter.use(requireAuth);
dataRouter.get('/export', asyncHandler(exportData));
dataRouter.post('/import', asyncHandler(importData));
