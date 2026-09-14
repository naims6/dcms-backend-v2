import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),

  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  EMAIL_PROVIDER: z.enum(['brevo', 'console']).default('brevo'),
  BREVO_API_KEY: z.string().optional(),
  SENDER_EMAIL: z.string().default('noreply@dcms.com'),
  SENDER_NAME: z.string().default('DCMS'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  SSLCOMMERZ_STORE_ID: z.string().default('testbox'),
  SSLCOMMERZ_STORE_PASSWORD: z.string().default('qwerty'),
  SSLCOMMERZ_IS_SANDBOX: z
    .string()
    .default('true')
    .transform((v) => v === 'true' || v === '1'),
  SSLCOMMERZ_BASE_URL: z.string().default('http://localhost:3000'),

  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000,http://localhost:3001'),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errorDetails: unknown = parsed.error.format();
  console.error(
    '❌ Invalid environment variables:',
    JSON.stringify(errorDetails, null, 2),
  );
  throw new Error('Invalid environment variables');
}

const configData: EnvConfig = parsed.data;

export const env = {
  nodeEnv: configData.NODE_ENV,
  isDev: configData.NODE_ENV === 'development',
  isProd: configData.NODE_ENV === 'production',
  port: configData.PORT,

  databaseUrl: configData.DATABASE_URL,

  redis: {
    host: configData.REDIS_HOST,
    port: configData.REDIS_PORT,
    password: configData.REDIS_PASSWORD,
  },

  jwtAccessSecret: configData.JWT_ACCESS_SECRET,
  jwtAccessExpiresIn: configData.JWT_ACCESS_EXPIRES_IN,

  jwtRefreshSecret: configData.JWT_REFRESH_SECRET,
  jwtRefreshExpiresIn: configData.JWT_REFRESH_EXPIRES_IN,

  mail: {
    provider: configData.EMAIL_PROVIDER,
    brevoApiKey: configData.BREVO_API_KEY,
    senderEmail: configData.SENDER_EMAIL,
    senderName: configData.SENDER_NAME,
  },

  cloudinary: {
    cloudName: configData.CLOUDINARY_CLOUD_NAME,
    apiKey: configData.CLOUDINARY_API_KEY,
    apiSecret: configData.CLOUDINARY_API_SECRET,
  },

  sslcommerz: {
    storeId: configData.SSLCOMMERZ_STORE_ID,
    storePassword: configData.SSLCOMMERZ_STORE_PASSWORD,
    isSandbox: configData.SSLCOMMERZ_IS_SANDBOX,
    baseUrl: configData.SSLCOMMERZ_BASE_URL,
  },

  cors: {
    origin: configData.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
};
