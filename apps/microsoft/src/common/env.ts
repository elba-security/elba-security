import { z } from 'zod';
import { config } from 'dotenv';

config();

const zEnvRetry = () =>
  z.string().transform(Number).pipe(z.number().int().min(0).max(20)) as unknown as z.ZodUnion<
    [
      z.ZodLiteral<0>,
      z.ZodLiteral<1>,
      z.ZodLiteral<2>,
      z.ZodLiteral<3>,
      z.ZodLiteral<4>,
      z.ZodLiteral<5>,
      z.ZodLiteral<6>,
      z.ZodLiteral<7>,
      z.ZodLiteral<8>,
      z.ZodLiteral<9>,
      z.ZodLiteral<10>,
      z.ZodLiteral<11>,
      z.ZodLiteral<12>,
      z.ZodLiteral<13>,
      z.ZodLiteral<14>,
      z.ZodLiteral<15>,
      z.ZodLiteral<16>,
      z.ZodLiteral<17>,
      z.ZodLiteral<18>,
      z.ZodLiteral<19>,
      z.ZodLiteral<20>,
    ]
  >;

const envVariables = z.object({
  ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  MICROSOFT_TPAC_APP_CLIENT_ID: z.string().min(1),
  MICROSOFT_TPAC_APP_CLIENT_SECRET: z.string().min(1),
  MICROSOFT_TPAC_APP_REDIRECT_URI: z.string().url(),
  POSTGRES_URL: z.string().min(1),
  POSTGRES_DATABASE: z.string().min(1),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_PRISMA_URL: z.string().min(1),
  POSTGRES_URL_NON_POOLING: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  ELBA_API_BASE_URL: z.string().url(),
  ELBA_SOURCE_ID: z.string().uuid(),
  ELBA_API_KEY: z.string().min(1),
  VERCEL_ENV: z.string().optional(),
  USERS_SYNC_CRON: z.string(),
  USERS_SYNC_MAX_RETRY: zEnvRetry(),
  USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive(),
  MAX_CONCURRENT_USERS_SYNCS: z.coerce.number().int().positive(),
  THIRD_PARTY_APPS_SYNC_CRON: z.string(),
  THIRD_PARTY_APPS_SYNC_MAX_RETRY: zEnvRetry(),
  THIRD_PARTY_APPS_SYNC_BATCH_SIZE: z.coerce.number().int().positive(),
  MAX_CONCURRENT_THIRD_PARTY_APPS_SYNCS: z.coerce.number().int().positive(),
});

export const env = envVariables.parse(process.env);
