import { z, type ZodTypeAny } from 'zod';

export const env = z
  .object({
    NEXT_PUBLIC_NANGO_INTEGRATION_ID: z.string().min(1),
    NEXT_PUBLIC_NANGO_PUBLIC_KEY: z.string().min(1),
  } satisfies Record<`NEXT_PUBLIC_${string}`, ZodTypeAny>)
  .parse({
    NEXT_PUBLIC_NANGO_INTEGRATION_ID: process.env.NEXT_PUBLIC_NANGO_INTEGRATION_ID,
    NEXT_PUBLIC_NANGO_PUBLIC_KEY: process.env.NEXT_PUBLIC_NANGO_PUBLIC_KEY,
  });
