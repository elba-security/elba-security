import { z } from 'zod';
import type { infer as zInfer } from 'zod';
import { baseDeleteRequestSchema, baseWebhookSchema, jsonSchema } from './common';

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

export const dataProtectionContentRequestedWebhookDataSchema = baseWebhookSchema.and(
  z.object({
    id: z.string().min(1),
    metadata: jsonSchema,
  })
);

export type DataProtectionContentRequestedWebhookData = z.infer<
  typeof dataProtectionContentRequestedWebhookDataSchema
>;

export const dataProtectionStartSyncRequestedWebhookDataSchema = baseWebhookSchema;

export type DataProtectionStartSyncRequestedWebhookData = z.infer<
  typeof dataProtectionStartSyncRequestedWebhookDataSchema
>;

export const dataProtectionObjectDeletedWebhookDataSchema = baseWebhookSchema.and(
  z.object({
    id: z.string().min(1),
    metadata: jsonSchema,
  })
);

export type DataProtectionObjectDeletedWebhookData = z.infer<
  typeof dataProtectionObjectDeletedWebhookDataSchema
>;

export const dataProtectionRefreshObjectRequestedWebhookDataSchema = baseWebhookSchema.and(
  z.object({
    id: z.string().min(1),
    metadata: jsonSchema,
  })
);

export type DataProtectionRefreshObjectRequestedWebhookData = z.infer<
  typeof dataProtectionRefreshObjectRequestedWebhookDataSchema
>;

export const dataProtectionDeleteObjectPermissionsRequestedDataSchema = baseWebhookSchema.and(
  z.object({
    id: z.string().min(1),
    metadata: jsonSchema,
    permissions: z.array(
      z.object({
        id: z.string().min(1),
        metadata: jsonSchema,
      })
    ),
  })
);

export type DataProtectionDeleteObjectPermissionsRequestedData = z.infer<
  typeof dataProtectionDeleteObjectPermissionsRequestedDataSchema
>;
