import type { DataProtectionDeleteObjectPermissionsRequestedData } from '@elba-security/schemas';
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
}: DataProtectionDeleteObjectPermissionsRequestedData) => {
  const objectMetadata = dataProtectionObjectMetadataSchema.parse(metadata);
  await inngest.send({
    name: 'confluence/data_protection.delete_object_permissions.requested',
    data: {
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
