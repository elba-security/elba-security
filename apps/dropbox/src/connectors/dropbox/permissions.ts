import { z } from 'zod';
import { env } from '@/common/env';
import { fileMetadataSchema, permissionSchema } from '../elba/data-protection/files';

const removePermissionSchema = z.object({
  accessToken: z.string(),
  objectId: z.string(),
  adminTeamMemberId: z.string(),
  metadata: fileMetadataSchema,
  permission: permissionSchema,
});

export type RemovePermission = z.infer<typeof removePermissionSchema>;

export const removePermission = async ({
  accessToken,
  objectId,
  adminTeamMemberId,
  metadata: { type, isPersonal, ownerId },
  permission: { id: permissionId, metadata },
}: RemovePermission) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(isPersonal
      ? { 'Dropbox-API-Select-User': ownerId }
      : { 'Dropbox-API-Select-Admin': adminTeamMemberId }),
  };

  if (metadata?.sharedLinks && metadata.sharedLinks.length > 0) {
    return Promise.all(
      metadata.sharedLinks.map(async (sharedLink: string) => {
        return fetch(`${env.DROPBOX_API_BASE_URL}/2/sharing/revoke_shared_link`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            url: sharedLink,
          }),
        });
      })
    );
  }

  if (type === 'folder') {
    return fetch(`${env.DROPBOX_API_BASE_URL}/2/sharing/remove_folder_member`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        leave_a_copy: false,
        shared_folder_id: objectId,
        member: {
          '.tag': 'email',
          email: permissionId,
        },
      }),
    });
  }

  return fetch(`${env.DROPBOX_API_BASE_URL}/2/sharing/remove_file_member_2`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      file: objectId,
      member: {
        '.tag': 'email',
        email: permissionId,
      },
    }),
  });
};
