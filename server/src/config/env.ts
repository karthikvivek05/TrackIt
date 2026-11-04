import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 5001,
  mongodbUri:
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trackit',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};
