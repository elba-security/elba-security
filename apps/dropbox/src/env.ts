import { z } from 'zod';

const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());
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
export const env = z
  .object({
    DROPBOX_CLIENT_ID: z.string(),
    DROPBOX_CLIENT_SECRET: z.string(),
    DROPBOX_CONCURRENT_DP_SYNC_JOBS: zEnvInt(),
    DROPBOX_DP_JOB_BATCH_SIZE: zEnvInt(),
    DROPBOX_REDIRECT_URI: z.string().url(),
    ENCRYPTION_KEY: z.string(),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().min(1),
    ELBA_API_KEY: z.string().min(1),
    ELBA_SOURCE_ID: z.string(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    TOKEN_REFRESH_MAX_RETRY: zEnvRetry(),
    VERCEL_ENV: z.string().optional(),
    ELBA_REGION: z.string(),
  })
  .parse(process.env);
