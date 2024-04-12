import type { FolderAndFilePermissions, GeneralFolderFilePermissions } from '../types';

export const formatPermissions = ({ users, invitees, anyone }: GeneralFolderFilePermissions) => {
  const formattedPermissions = new Map<string, FolderAndFilePermissions>();

  users.forEach(
    ({
      user: { email, team_member_id: teamMemberId, display_name: displayName },
      access_type: accessType,
      is_inherited: isInherited,
    }) => {
      if (accessType['.tag'] !== 'owner' && isInherited) {
        return;
      }

      formattedPermissions.set(email, {
        id: email,
        email,
        ...(teamMemberId && { team_member_id: teamMemberId }),
        ...(displayName && { display_name: displayName }),
        type: 'user' as const,
        role: accessType['.tag'],
      });
    }
  );

  invitees.forEach(({ invitee, access_type: accessType, is_inherited: isInherited, user }) => {
    const hasEmail = invitee['.tag'] === 'email' && Boolean(invitee.email);

    if (!hasEmail || (accessType['.tag'] !== 'owner' && isInherited)) {
      return;
    }

    formattedPermissions.set(invitee.email, {
      id: invitee.email,
      email: invitee.email,
      ...(user?.team_member_id && { team_member_id: user.team_member_id }),
      ...(user?.display_name && { team_member_id: user.display_name }),
      role: accessType['.tag'],
      type: 'user' as const,
    });
  });

  if (anyone && anyone.length > 0) {
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
