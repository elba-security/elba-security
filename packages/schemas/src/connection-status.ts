import type { infer as zInfer } from 'zod';
import { z } from 'zod';
import { jsonSchema } from './common';

export const connectionErrorTypeSchema = z.enum([
  'not_admin',
  'unauthorized',
  'unknown',
  'unsupported_plan',
  'multiple_workspaces_not_supported',
]);

export type ConnectionErrorType = zInfer<typeof connectionErrorTypeSchema>;

export const updateConnectionStatusDataSchema = z.object({
  errorType: connectionErrorTypeSchema.nullable(),
  errorMetadata: jsonSchema,
});

export type UpdateConnectionStatusData = zInfer<typeof updateConnectionStatusDataSchema>;
