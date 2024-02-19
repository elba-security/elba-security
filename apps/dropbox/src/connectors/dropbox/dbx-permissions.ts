import { DeleteObjectPermissionsSchema } from '@/inngest/types';
import { DBXAccess } from './dbx-access';
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

    if (metadata?.sharedLinks && metadata?.sharedLinks?.length > 0) {
      return metadata?.sharedLinks?.map(async (sharedLink: string) => {
        return await this.dbx.sharingRevokeSharedLink({
          url: sharedLink,
        });
      });
    }

    if (type == 'folder') {
      return await this.dbx.sharingRemoveFolderMember({
        leave_a_copy: false,
        shared_folder_id: idSource,
        member: {
          '.tag': 'email',
          email: permissionId,
        },
      });
    }

    if (type == 'file') {
      return await this.dbx.sharingRemoveFileMember2({
        file: idSource,
        member: {
          '.tag': 'email',
          email: permissionId,
        },
      });
    }
  };
}
