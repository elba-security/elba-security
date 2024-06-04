import { z } from 'zod';

export const env = z
  .object({
    NEXT_PUBLIC_MONDAY_CLIENT_ID: z.string().min(1),
  })
  .parse({
    NEXT_PUBLIC_MONDAY_CLIENT_ID: process.env.NEXT_PUBLIC_MONDAY_CLIENT_ID,
  });
