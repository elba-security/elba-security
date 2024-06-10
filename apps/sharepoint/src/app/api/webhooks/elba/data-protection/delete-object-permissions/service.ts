import { inngest } from '@/inngest/client';
import type { DeleteItemPermissionsSchema } from './types';

export const deleteObjectPermissions = async (data: DeleteItemPermissionsSchema) => {
  await inngest.send({
    name: 'sharepoint/data_protection.delete_object_permissions.requested',
    data: {
      id: data.id,
      organisationId: data.organisationId,
      metadata: data.metadata,
      permissions: data.permissions.map((p) => p.id),
    },
  });
};
