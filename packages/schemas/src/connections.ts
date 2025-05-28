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

export const updateConnectionsObjectsSchema = z.object({
  detection_method: z.literal('email_scanning'),
  apps: z.array(sourceConnectionEmailScanningAppSchema),
});

export type UpdateConnectionsObjects = z.infer<typeof updateConnectionsObjectsSchema>;

export const deleteConnectionsObjectsSchema = z.object({
  detectionMethod: z.literal('email_scanning'),
  syncedBefore: z.string().datetime(),
});

export type DeleteConnectionsObjects = z.infer<typeof deleteConnectionsObjectsSchema>;
