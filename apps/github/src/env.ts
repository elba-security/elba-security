import { z } from 'zod';

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
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_API_KEY: z.string(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    GITHUB_APP_INSTALL_URL: z.string().url(),
    GITHUB_APP_ID: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_CLIENT_ID: z.string(),
    GITHUB_CLIENT_SECRET: z.string(),
    POSTGRES_URL: z.string(),
    MAX_CONCURRENT_USERS_SYNC: z.coerce.number().int().positive(),
    USERS_SYNC_CRON: z.string(),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().optional(),
  })
  .parse(process.env);
