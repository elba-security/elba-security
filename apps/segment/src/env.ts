import { z } from 'zod';

const zEnvRetry = (defaultValue = '3') =>
  z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(0).max(20))
    .default(defaultValue) as unknown as z.ZodUnion<
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
    ELBA_API_KEY: z.string().min(1),
    ELBA_API_BASE_URL: z.string().url(),
    ELBA_REDIRECT_URL: z.string().url(),
    ELBA_SOURCE_ID: z.string().uuid(),
    ELBA_WEBHOOK_SECRET: z.string().min(1),
    POSTGRES_URL: z.string().min(1),
    POSTGRES_HOST: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1),
    POSTGRES_DATABASE: z.string().min(1),
    POSTGRES_PROXY_PORT: z.coerce.number().int().positive(),
    VERCEL_PREFERRED_REGION: z.string().min(1),
    VERCEL_ENV: z.string().min(1).optional(),
    USERS_SYNC_CRON: z.string(),
    USERS_SYNC_MAX_RETRY: zEnvRetry(),
    REMOVE_ORGANISATION_MAX_RETRY: zEnvRetry(),
    SEGMENT_API_TOKEN: z.string(),
    USERS_SYNC_BATCH_SIZE: z.coerce.number().int().positive().default(200),
  })
  .parse(process.env);
