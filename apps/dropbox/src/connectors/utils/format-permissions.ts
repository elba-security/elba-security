import { FolderAndFilePermissions, GeneralFolderFilePermissions } from '../types';

export const formatPermissions = ({ users, invitees, anyone }: GeneralFolderFilePermissions) => {
  const formattedPermissions = new Map<string, FolderAndFilePermissions>();

  users.forEach(({ user: { email, team_member_id, display_name }, access_type, is_inherited }) => {
    if (access_type['.tag'] !== 'owner' && is_inherited) {
      return;
    }

    formattedPermissions.set(email, {
      id: email,
      email,
      ...(team_member_id && { team_member_id }),
      ...(display_name && { display_name }),
      type: 'user' as const,
      role: access_type['.tag'],
    });
  });

  invitees.forEach(({ invitee, access_type, is_inherited, user }) => {
    const hasEmail = invitee['.tag'] === 'email' && !!invitee.email;

    if (!hasEmail || (access_type['.tag'] !== 'owner' && is_inherited)) {
      return;
    }

    formattedPermissions.set(invitee.email, {
      id: invitee.email,
      email: invitee.email,
      ...(user?.team_member_id && { team_member_id: user.team_member_id }),
      ...(user?.display_name && { team_member_id: user.display_name }),
      role: access_type['.tag'],
      type: 'user' as const,
    });
  });

  if (anyone && anyone?.length > 0) {
    const links = anyone.map((link) => link.url);

    const pickedLink = anyone.find((link) => link.linkAccessLevel === 'editor');
    const linkId = links.join('::');
    formattedPermissions.set(linkId, {
      id: linkId,
      type: 'anyone' as const,
      role: pickedLink ? 'editor' : 'viewer',
      metadata: {
        sharedLinks: links,
      },
    });
  }

  return Array.from(formattedPermissions.values());
};
