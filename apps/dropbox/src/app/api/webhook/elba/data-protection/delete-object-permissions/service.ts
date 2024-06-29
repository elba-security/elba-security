import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import type { FileMetadata } from '@/inngest/types';
import { filePermissionsSchema, fileMetadataSchema } from '@/inngest/types';

export const deleteObjectPermissions = async ({
  id,
  organisationId,
  metadata,
  permissions,
}: {
  id: string;
  organisationId: string;
  metadata: unknown;
  permissions: {
    id: string;
    metadata?: unknown;
  }[];
}) => {
  const fileMetadataResult = fileMetadataSchema.safeParse(metadata);
  const permissionMetadataResult = filePermissionsSchema.safeParse(permissions);

  if (!fileMetadataResult.success) {
    logger.error('Invalid file metadata', { id, organisationId, metadata, permissions });
    return;
  }

  if (!permissionMetadataResult.success) {
    logger.error('Invalid permissions', { id, organisationId, metadata, permissions });
    return;
  }

  await inngest.send(
    permissions.map((permission) => ({
      name: 'dropbox/data_protection.delete_object_permission.requested',
      data: {
        id,
        organisationId,
        metadata: metadata as FileMetadata,
        permission,
      },
    }))
  );
};
