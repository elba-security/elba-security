import { z } from 'zod';

export const getEnv = () =>
  z
    .object({
      POSTGRES_URL: z.string().min(1),
    })
    .parse(process.env);
