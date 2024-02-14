import { DeleteObjectPermissions } from '@/connectors/types';
import { inngest } from '@/inngest/client';

export const deleteObjectPermissions = async (data: DeleteObjectPermissions) => {
  await inngest.send(
    data.permissions.map((permission) => ({
      name: 'dropbox/data_protection.delete_object_permission.requested',
      data: {
        id: data.id,
        organisationId: data.organisationId,
        metadata: data.metadata,
        permission,
      },
    }))
  );
};
