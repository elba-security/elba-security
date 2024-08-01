import { z } from 'zod';

/* PAGES */

export const pageObjectMetadataSchema = z.object({
  objectType: z.literal('page'),
});

export type PageObjectMetadata = z.infer<typeof pageObjectMetadataSchema>;

export const pageObjectPermissionMetadataSchema = z.object({
  userId: z.string().min(1),
});

export type PageObjectPermissionMetadata = z.infer<typeof pageObjectPermissionMetadataSchema>;

/* SPACES */

export const spaceObjectMetadataSchema = z.object({
  objectType: z.literal('space'),
  type: z.enum(['personal', 'global']),
  key: z.string().min(1),
});

export type SpaceObjectMetadata = z.infer<typeof spaceObjectMetadataSchema>;

export const spaceObjectPermissionMetadataSchema = z.object({
  ids: z.array(z.string().min(1)),
});

export type SpaceObjectPermissionMetadata = z.infer<typeof spaceObjectPermissionMetadataSchema>;

/* COMMON */

export const dataProtectionObjectMetadataSchema = z.union([
  spaceObjectMetadataSchema,
  pageObjectMetadataSchema,
]);

export type DataProtectionObjectMetadata = z.infer<typeof dataProtectionObjectMetadataSchema>;
