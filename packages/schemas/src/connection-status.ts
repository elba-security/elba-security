import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { jsonSchema } from './common';

export const connectionErrorTypeSchema = z.enum([
  'not_admin',
  'unauthorized',
  'unknown',
  'unsupported_plan',
]);

export type ConnectionErrorType = zInfer<typeof connectionErrorTypeSchema>;

export const updateConnectionStatusSchema = z.object({
  errorType: connectionErrorTypeSchema.nullable(),
  errorMetadata: jsonSchema,
});

export type UpdateConnectionStatus = zInfer<typeof updateConnectionStatusSchema>;
