import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
  });
}
