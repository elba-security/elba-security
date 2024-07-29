import { inngest } from '@/inngest/client';
import { z } from 'zod';

const deleteObjectPermissionsSchema = z.object({
  id: z.string(),
  organisationId: z.string(),
  metadata: z.object({
    ownerId: z.string(),
    type: z.union([z.literal('file'), z.literal('folder')]),
    isPersonal: z.boolean(),
  }),
  permissions: z.array(
    z.object({
      id: z.string(),
      metadata: z.object({
        sharedLinks: z.array(z.string()).optional(),
      }),
    })
  ),
});

export type DeleteObjectPermissions = z.infer<typeof deleteObjectPermissionsSchema>;

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
