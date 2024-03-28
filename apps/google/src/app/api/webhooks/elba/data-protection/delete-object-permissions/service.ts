import { logger } from '@elba-security/logger';
import { fileMetadataSchema } from '@/connectors/elba/data-protection';
import { inngest } from '@/inngest/client';

export const deleteDataProtectionObjectPermissions = async ({
  organisationId,
  objectId,
  metadata,
  permissionIds,
}: {
  organisationId: string;
  objectId: string;
  metadata: any; // eslint-disable-line -- metadata type is any
  permissionIds: string[];
}) => {
  const result = fileMetadataSchema.safeParse(metadata);
  if (!result.success) {
    logger.error('Invalid file metadata', { organisationId, objectId, metadata }); // eslint-disable-line -- metadata type is any
    return;
  }

  await inngest.send({
    name: 'google/data_protection.delete_object_permissions.requested',
    data: {
      organisationId,
      objectId,
      ownerId: result.data.ownerId,
      permissionIds,
    },
  });
};
