import { objectMetadataSchema, permissionMetadataSchema } from '@/connectors/elba/data-protection';
import { inngest } from '@/inngest/client';

export const deleteObjectPermissions = async ({
  organisationId,
  id,
  permissions,
  metadata,
}: {
  organisationId: string;
  id: string;
  permissions: { id: string; metadata?: unknown }[];
  metadata?: unknown;
}) => {
  await inngest.send({
    name: 'onedrive/data_protection.delete_object_permissions.requested',
    data: {
      id,
      organisationId,
      metadata: objectMetadataSchema.parse(metadata),
      permissions: permissions.map(({ id: permissionId, metadata: permissionMetadata }) => ({
        id: permissionId,
        metadata: permissionMetadataSchema.parse(permissionMetadata),
      })),
    },
  });
};
