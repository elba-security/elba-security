import { FileToAdd, FolderAndFilePermissions } from '@/connectors/types';
import { DataProtectionPermission } from '@elba-security/schemas';

const formatPermissionsToAdd = (permission: FolderAndFilePermissions[]) => {
  return permission.map(({ id, type, email, metadata }) => {
    return {
      id,
      type,
      ...(email && { email }), // Optional for anyone
      metadata,
    } as DataProtectionPermission;
  });
};

export const formatFilesToAdd = ({
  files,
  teamMemberId,
}: {
  files: FileToAdd[];
  teamMemberId: string;
}) => {
  return files.flatMap((file) => {
    const permissions = formatPermissionsToAdd(file.permissions);

    const sourceOwner = file.permissions.find((permission) => permission.role === 'owner');

    const isPersonal = sourceOwner?.team_member_id === teamMemberId;

    if (!permissions.length) {
      return [];
    }

    // If personal folder is shared with other team members, this shared folder will appear  for both team members
    // therefore we need to filter out the files that are not belong to the current team member
    if (sourceOwner && !isPersonal) {
      return [];
    }

    const isFile = file['.tag'] === 'file';

    // IF the  folder doesn't have shared_folder_id, ignore it
    if (!isFile && !file.shared_folder_id) {
      return [];
    }

    return {
      id: (isFile ? file.id : file.shared_folder_id) as string,
      name: file.name,
      ownerId: teamMemberId,
      url: file.metadata.preview_url,
      ...(isFile && { contentHash: file.content_hash }),
      metadata: {
        ownerId: teamMemberId,
        isPersonal,
        type: file['.tag'],
      },
      permissions,
    };
  });
};
