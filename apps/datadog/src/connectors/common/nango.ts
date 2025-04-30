import { z } from 'zod';

export const nangoConnectionConfigSchema = z.object({
  siteParameter: z.string(),
  applicationKey: z.string(),
});
