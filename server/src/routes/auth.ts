import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { register, login, me, updateMe } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', asyncHandler(register));
authRouter.post('/login', asyncHandler(login));
authRouter.get('/me', requireAuth, asyncHandler(me));
authRouter.patch('/me', requireAuth, asyncHandler(updateMe));
