import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  // Database
  databaseUrl: process.env.DATABASE_URL ?? '',

  // JWT Access Token
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? 'default_access_secret_key',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

  // JWT Refresh Token
  jwtRefreshSecret:
    process.env.JWT_REFRESH_SECRET ?? 'default_refresh_secret_key',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
};
