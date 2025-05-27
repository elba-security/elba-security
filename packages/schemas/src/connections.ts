import { z } from 'zod';
import { jsonSchema } from './common';

const baseSourceConnectionUserSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  lastAccessedAt: z.string().datetime().optional(),
  scopes: z.array(z.string().min(1)),
  metadata: jsonSchema,
});

const baseSourceConnectionAppSchema = z.strictObject({
  name: z.string().min(1),
  logoUrl: z.string().url().optional(),
  metadata: jsonSchema,
});

export const sourceConnectionEmailScanningAppSchema = baseSourceConnectionAppSchema.extend({
  users: z.array(baseSourceConnectionUserSchema).min(1),
});

export type SourceConnectionEmailScanningApp = z.infer<
  typeof sourceConnectionEmailScanningAppSchema
>;
