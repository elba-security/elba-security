import type { DataProtectionDeleteObjectPermissionsRequestedData } from '@elba-security/schemas';
import { logger } from '@elba-security/logger';
import {
  dataProtectionObjectMetadataSchema,
  pageObjectPermissionMetadataSchema,
  spaceObjectPermissionMetadataSchema,
} from '@/connectors/elba/data-protection/metadata';
import { inngest } from '@/inngest/client';

export const deleteDataProtectionObjectPermissions = async ({
  organisationId,
  id,
  metadata,
  permissions,
  nangoConnectionId,
  region,
}: DataProtectionDeleteObjectPermissionsRequestedData) => {
  const objectMetadata = dataProtectionObjectMetadataSchema.parse(metadata);

  if (!nangoConnectionId) {
    logger.error('Missing nango connection ID', { organisationId });
    throw new Error('Missing nango connection ID');
  }

  await inngest.send({
    name: 'confluence/data_protection.delete_object_permissions.requested',
    data: {
      nangoConnectionId,
      region,
      organisationId,
      objectId: id,
      metadata: objectMetadata,
      permissions: permissions.map((permission) => ({
        ...permission,
        metadata:
          objectMetadata.objectType === 'space'
            ? spaceObjectPermissionMetadataSchema.parse(permission.metadata)
            : pageObjectPermissionMetadataSchema.parse(permission.metadata),
      })),
    },
  });
};
