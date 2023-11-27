import { z } from 'zod';
import type { infer as zInfer } from 'zod';
import { jsonSchema } from './common';

export const updateThirdPartyAppsSchema = z.object({
  apps: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      description: z.string().min(1).optional(),
      logoUrl: z.string().min(1).optional(),
      url: z.string().min(1).optional(),
      publisherName: z.string().min(1).optional(),
      metadata: jsonSchema,
      users: z.array(
        z.object({
          id: z.string().min(1),
          createdAt: z.string().min(1).optional(),
          lastAccessedAt: z.string().min(1).optional(),
          scopes: z.array(z.string().min(1)),
          metadata: jsonSchema,
        })
      ),
    })
  ),
});

export type UpdateThirdPartyApps = zInfer<typeof updateThirdPartyAppsSchema>;

export const deleteThirdPartyAppsSchema = z.union([
  z.object({
    ids: z.array(z.object({ userId: z.string().min(1), appId: z.string().min(1) })),
  }),
  z.object({
    syncedBefore: z.string().datetime(),
  }),
]);;

export type DeleteThirdPartyApps = zInfer<typeof deleteThirdPartyAppsSchema>;
