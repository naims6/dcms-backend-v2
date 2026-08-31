import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL ?? '',

  // JWT Authentication
  jwtSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
};
