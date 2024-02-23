import { z } from 'zod';

export const zPaginatedResponse = z.object({
  values: z.array(z.unknown()),
  pagelen: z.number(),
  size: z.number(),
  page: z.number(),
  next: z.string().optional(),
  previous: z.string().optional(),
});
