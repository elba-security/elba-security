import {
  DBXPermissionType,
  FolderAndFilePermissions,
  GeneralFolderFilePermissions,
} from '../types/types';

export const formatPermissions = ({ users, invitees, anyone }: GeneralFolderFilePermissions) => {
  const formattedPermissions: FolderAndFilePermissions[] = [];

  users.forEach(({ user: { email, team_member_id, display_name }, access_type, is_inherited }) => {
    if (access_type['.tag'] !== 'owner' && is_inherited) {
      return;
    }

    const permission: FolderAndFilePermissions = {
      id: email,
      email,
      ...(team_member_id && { team_member_id }),
      ...(display_name && { display_name }),
      type: 'user' as DBXPermissionType,
      role: access_type['.tag'],
    };

    formattedPermissions.push(permission);
  });

  invitees.forEach(({ invitee, access_type, is_inherited, user }) => {
    const hasEmail = invitee['.tag'] === 'email' && !!invitee.email;

    if (!hasEmail || (access_type['.tag'] !== 'owner' && is_inherited)) {
      return;
    }

    const permission: FolderAndFilePermissions = {
      id: invitee.email,
      email: invitee.email,
      ...(user?.team_member_id && { team_member_id: user.team_member_id }),
      ...(user?.display_name && { team_member_id: user.display_name }),
      role: access_type['.tag'],
      type: 'user' as DBXPermissionType,
    };

    formattedPermissions.push(permission);
  });

  if (anyone && anyone?.length > 0) {
    const links = anyone.map((link) => link.url);

    let pickedLink = anyone.find((link) => link.linkAccessLevel === 'editor');
    formattedPermissions.push({
      id: links.join('::'),
      type: 'anyone' as DBXPermissionType,
      role: pickedLink ? 'editor' : 'viewer',
      metadata: {
        shared_links: links,
      },
    });
  }

  return formattedPermissions;
};
