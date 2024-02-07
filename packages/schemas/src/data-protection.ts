import { z } from 'zod';
import type { infer as zInfer } from 'zod';
import { baseDeleteRequestSchema, jsonSchema } from './common';

const basePermissionSchema = z.object({
  id: z.string().min(1),
  metadata: jsonSchema,
});

const baseUserPermissionSchema = basePermissionSchema.extend({
  type: z.literal('user'),
});

const permissionSchema = z.union([
  baseUserPermissionSchema.extend({
    email: z.string().email(),
  }),
  baseUserPermissionSchema.extend({
    userId: z.string().min(1),
    displayName: z.string().min(1),
  }),
  basePermissionSchema.extend({
    type: z.literal('domain'),
    domain: z.string().min(1).optional(),
  }),
  basePermissionSchema.extend({
    type: z.literal('anyone'),
  }),
]);

export type DataProtectionPermission = zInfer<typeof permissionSchema>;

export const updateDataProtectionObjectsSchema = z.object({
  objects: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      lastAccessedAt: z.string().datetime().optional(),
      url: z.string().url(),
      ownerId: z.string().min(1),
      metadata: jsonSchema,
      contentHash: z.string().min(1).optional(),
      isSensitive: z.boolean().optional(),
      updatedAt: z.string().datetime().optional(),
      permissions: z.array(permissionSchema),
    })
  ),
});

export type UpdateDataProtectionObjects = zInfer<typeof updateDataProtectionObjectsSchema>;

export const deleteDataProtectionObjectsSchema = baseDeleteRequestSchema;

export type DeleteDataProtectionObjects = zInfer<typeof deleteDataProtectionObjectsSchema>;

export const dataProtectionContentRequestedWebhookDataSchema = z.object({
  organisationId: z.string().uuid(),
  id: z.string().min(1),
  metadata: jsonSchema,
});

export const dataProtectionStartSyncRequestedWebhookDataSchema = z.object({
  organisationId: z.string().uuid(),
});

export const dataProtectionObjectDeletedWebhookDataSchema = z.object({
  organisationId: z.string().uuid(),
  id: z.string().min(1),
  metadata: jsonSchema,
});

export const dataProtectionRefreshObjectRequestedWebhookDataSchema = z.object({
  organisationId: z.string().uuid(),
  id: z.string().min(1),
  metadata: jsonSchema,
});

export const dataProtectionDeleteObjectPermissionsRequestedDataSchema = z.object({
  id: z.string().min(1),
  organisationId: z.string().uuid(),
  metadata: jsonSchema,
  permissions: z.array(
    z.object({
      id: z.string().min(1),
      metadata: jsonSchema,
    })
  ),
});
