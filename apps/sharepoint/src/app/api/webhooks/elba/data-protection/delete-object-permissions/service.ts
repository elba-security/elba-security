import { inngest } from '@/inngest/client';
import { itemMetadataSchema } from '@/inngest/functions/data-protection/common/helpers';

export const deleteObjectPermissions = async ({
  organisationId,
  id,
  permissions,
  metadata,
}: {
  organisationId: string;
  id: string;
  permissions: { id: string }[];
  metadata?: unknown;
}) => {
  await inngest.send({
    name: 'sharepoint/data_protection.delete_object_permissions.requested',
    data: {
      id,
      organisationId,
      metadata: itemMetadataSchema.parse(metadata),
      permissions: permissions.map((p) => p.id),
    },
  });
};
