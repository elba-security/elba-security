import { z } from 'zod';

export const zInngestRetry = (...params: Parameters<typeof z.number>) =>
  z.coerce
    .number(...params)
    .int()
    .min(0)
    .max(20)
    .optional()
    .default(3) as unknown as z.ZodLiteral<
    0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20
  >;
