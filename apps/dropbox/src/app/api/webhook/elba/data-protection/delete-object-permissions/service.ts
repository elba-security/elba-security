import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import type { FileMetadata } from '@/inngest/types';
import { fileMetadataSchema } from '@/inngest/types';

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
  const result = fileMetadataSchema.safeParse(metadata);

  if (!result.success) {
    logger.error('Invalid file metadata', { id, organisationId, metadata, permissions });
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
