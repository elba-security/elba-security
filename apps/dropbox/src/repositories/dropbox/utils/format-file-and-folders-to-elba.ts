import {
  FileToAdd,
  FolderAndFilePermissions,
  FolderAndFilePermissionsToSend,
} from '../types/types';

const formatPermissionsToAdd = (
  permission: FolderAndFilePermissions[]
): FolderAndFilePermissionsToSend[] => {
  return permission.map(
    ({ id, type, email, metadata, team_member_id: userId, display_name: displayName }) => ({
      id,
      type,
      ...(email && { email }),
      ...(displayName && { displayName }),
      ...(userId && { userId }),
      metadata,
    })
  );
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

    // If the file is in a team member personal folder, and the owner of the file is not a team member
    // then we don't want to add the file to the database
    // if (isPersonal && !sourceOwner?.team_member_id) {
    //   return [];
    // }

    // If personal folder is shared with other team members, this shared folder will appear  for both team members
    // therefore we need to filter out the files that are not belong to the current team member
    if (sourceOwner && !isPersonal) {
      return [];
    }

    const isFile = file['.tag'] === 'file';

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
        isPersonal,
        type: file['.tag'],
      },
      permissions,
    };
  });
};
