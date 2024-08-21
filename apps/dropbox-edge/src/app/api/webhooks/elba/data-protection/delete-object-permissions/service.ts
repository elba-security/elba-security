import { inngest } from '@/inngest/client';
import {
  deletePermissionsSchema,
  fileMetadataSchema,
} from '@/connectors/elba/data-protection/files';

export const deleteDataProtectionObjectPermissions = async ({
  organisationId,
  id: objectId,
  metadata,
  permissions,
}: {
  organisationId: string;
  id: string;
  metadata: unknown;
  permissions: unknown;
}) => {
  const metadataResult = fileMetadataSchema.safeParse(metadata);

  if (!metadataResult.success) {
    throw new Error('Invalid Dropbox refresh object arguments provided', {
      cause: metadataResult.error,
    });
  }

  const permissionsResult = deletePermissionsSchema.safeParse(permissions);

  if (!permissionsResult.success) {
    throw new Error('Invalid Dropbox permissions provided to delete', {
      cause: permissionsResult.error,
    });
  }

  await inngest.send(
    permissionsResult.data.map((permission) => ({
      name: 'dropbox/data_protection.delete_object_permission.requested',
      data: {
        objectId,
        organisationId,
        metadata: metadataResult.data,
        permission,
      },
    }))
  );
};
