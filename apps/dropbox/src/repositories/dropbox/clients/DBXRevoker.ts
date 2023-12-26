import { DBXAccess } from './DBXAccess';

export class DBXRevoker extends DBXAccess {
  constructor({
    accessToken,
    isPersonal,
    teamMemberId,
    adminTeamMemberId,
  }: {
    accessToken: string;
    isPersonal: boolean;
    teamMemberId?: string;
    adminTeamMemberId?: string;
  }) {
    super({
      accessToken,
      ...(isPersonal ? { selectUser: teamMemberId } : { selectAdmin: adminTeamMemberId }),
    });
  }

  async deleteFolderPermission({ folderId, email }: { folderId: string; email: string }) {
    const { result } = await super.sharingRemoveFolderMember({
      leave_a_copy: false,
      shared_folder_id: folderId,
      member: {
        '.tag': 'email',
        email,
      },
    });
    return result;
  }

  async deleteFilePermission({ fileId, email }: { fileId: string; email: string }) {
    const { result } = await super.sharingRemoveFileMember2({
      file: fileId,
      member: {
        '.tag': 'email',
        email,
      },
    });
    return result;
  }

  async deleteSharedLink({ sharedLink }: { sharedLink: string }) {
    const { result } = await super.sharingRevokeSharedLink({ url: sharedLink });
    return result;
  }
}
