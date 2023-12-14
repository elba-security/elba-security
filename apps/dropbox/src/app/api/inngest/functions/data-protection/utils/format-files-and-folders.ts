import { DataProtectionObject } from '@elba-security/sdk';
import { FolderAndFilePermissions } from '../types';

const formatPermissionToAdd = (permission: FolderAndFilePermissions) => {
  return {
    id: permission.id,
    type: permission.type === 'group' ? 'user' : permission.type,
    displayName: null,
    userId: null,
    domain: permission.domain,
    email: permission.email,
    metadata: null,
  };
};

type PermissionToAdd = ReturnType<typeof formatPermissionToAdd>;

const formatPermissionsToAdd = ({ permissions }: { permissions: FolderAndFilePermissions[] }) => {
  const { allPermissions, sharedLinkPermissions } = permissions.reduce<{
    allPermissions: PermissionToAdd[];
    sharedLinkPermissions: FolderAndFilePermissions[];
  }>(
    (acc, obj) => {
      const permission = formatPermissionToAdd(obj);

      // Group permissions are ignored and related codes have been removed
      // Dropbox doesn't provide email for group permissions, therefore we can't identify whether the group is part of the organisation or not
      // in this case we can't create an issue

      // Multiple shared links may exist for the same file or folder.
      // Identify and halt these links for now, and proceed with processing them at a later time.

      if (obj.type === 'anyone') {
        acc.sharedLinkPermissions.push(obj);
        return acc;
      }

      // Personal folders inherit the permissions from the parent folder
      if (obj?.role !== 'owner' && obj.is_inherited) {
        return acc;
      }
      // If the permission is for a domain that is part of the organisation
      //   if (obj.domain && organisationDomains.includes(obj.domain)) {
      //     return acc;
      //   }

      // id can be null for invitees
      // Ignore those permissions
      if (!obj.id) {
        return acc;
      }

      acc.allPermissions.push(permission);
      return acc;
    },
    { allPermissions: [], sharedLinkPermissions: [] }
  );

  // there could be multiple shared links for the same file/folder, we only want to keep one
  // Since shared link doesn't have proper , combination of urls can be used as id_source
  if (sharedLinkPermissions.length > 0) {
    const sharedLinkId = `${sharedLinkPermissions.map((link) => link.shared_link).join('::')}`;

    let pickedLink = sharedLinkPermissions.find((link) => link.role === 'editor'); // priority to editor

    if (!pickedLink) {
      pickedLink = sharedLinkPermissions.at(0);
    }

    allPermissions.push({
      ...formatPermissionToAdd(pickedLink!),
      id: sharedLinkId,
    });
  }

  return allPermissions;
};

export const formatFilesToAdd = ({ files, isPersonal, teamMemberId }): DataProtectionObject => {
  return files.flatMap((file) => {
    const permissions = formatPermissionsToAdd({
      permissions: file.permissions,
    });

    const sourceOwner = file.permissions.find((permission) => permission.role === 'owner');

    // if the file has anyone permissions, the shared links will stored in the metadata
    const anyonePermissions = file.permissions.filter((permission) => permission.type === 'anyone');

    if (!permissions.length) {
      return [];
    }

    // If the file is in a team member personal folder, and the owner of the file is not a team member
    // then we don't want to add the file to the database
    if (isPersonal && !sourceOwner?.team_member_id) {
      return [];
    }

    // If personal folder is shared with other team members, this shared folder will appear  for both team members
    // therefore we need to filter out the files that are not belong to the current team member
    if (isPersonal && sourceOwner?.team_member_id !== teamMemberId) {
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
      contentHash: isFile ? file.content_hash : null,
      lastAccessedAt: null,
      metadata: {
        is_personal: isPersonal,
        type: file['.tag'],
        shared_links: anyonePermissions.map((permission) => permission.shared_link),
      },
      permissions,
    };
  });
};
