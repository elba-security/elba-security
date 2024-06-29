import { z } from 'zod';
import type { DeleteObjectPermissionsSchema } from '@/inngest/types';
import { DBXAccess } from './dbx-access';

const permissionMetadataSchema = z.object({
  sharedLinks: z.array(z.string()),
});

type PermissionMetadata = z.infer<typeof permissionMetadataSchema>;

export class DBXPermissions {
  private adminTeamMemberId?: string;
  private dbx: DBXAccess;

  constructor({
    accessToken,
    adminTeamMemberId,
  }: {
    accessToken: string;
    adminTeamMemberId: string;
  }) {
    this.adminTeamMemberId = adminTeamMemberId;

    this.dbx = new DBXAccess({
      accessToken,
    });

    this.dbx.setHeaders({
      selectAdmin: this.adminTeamMemberId,
    });
  }

  removePermissions = async ({
    id: idSource,
    metadata: { type, isPersonal, ownerId },
    permission: { id: permissionId, metadata },
  }: DeleteObjectPermissionsSchema) => {
    this.dbx.setHeaders({
      ...(isPersonal ? { selectUser: ownerId } : { selectAdmin: this.adminTeamMemberId }),
    });

    const parseMetadata = permissionMetadataSchema.safeParse(metadata);

    if (parseMetadata.success) {
      return (metadata as PermissionMetadata).sharedLinks.map(async (sharedLink: string) => {
        return this.dbx.sharingRevokeSharedLink({
          url: sharedLink,
        });
      });
    }

    if (type === 'folder') {
      return this.dbx.sharingRemoveFolderMember({
        leave_a_copy: false,
        shared_folder_id: idSource,
        member: {
          '.tag': 'email',
          email: permissionId,
        },
      });
    }

    return this.dbx.sharingRemoveFileMember2({
      file: idSource,
      member: {
        '.tag': 'email',
        email: permissionId,
      },
    });
  };
}
