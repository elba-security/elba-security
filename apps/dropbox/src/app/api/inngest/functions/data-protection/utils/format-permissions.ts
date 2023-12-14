import { sharing } from 'dropbox/types/dropbox_types';
import {
  DBXPermissionType,
  FolderAndFilePermissions,
  FolderFilePermissions,
  SharedLinks,
} from '../types';

const pickDomain = (email: string) => email.split('@')[1];

export const formatPermissions = (permissions: FolderFilePermissions[]) => {
  const formattedPermissions: Map<string, FolderAndFilePermissions[]> = new Map();
  permissions.forEach(({ id, users, invitees }) => {
    formattedPermissions.set(id, [
      // Format users
      ...users.map(({ access_type, user, is_inherited }) => ({
        id: user.email,
        email: user.email,
        domain: pickDomain(user.email),
        team_member_id: user.team_member_id ?? null,
        display_name: null,
        type: 'user' as DBXPermissionType,
        role: access_type['.tag'],
        is_inherited,
      })),
      // Format Invitees
      ...invitees.map(({ access_type, invitee, is_inherited }) => {
        const hasEmail = invitee['.tag'] === 'email' && !!invitee?.email;
        return {
          id: hasEmail ? invitee.email : null,
          email: hasEmail ? invitee.email : null,
          domain: hasEmail ? pickDomain(invitee.email) : null,
          team_member_id: null,
          display_name: null,
          type: 'user' as DBXPermissionType,
          role: access_type['.tag'],
          is_inherited,
        };
      }),
    ]);
  });

  return formattedPermissions;
};

export const formatSharedLinksPermission = (sharedLinks: Omit<SharedLinks, 'organisationId'>[]) =>
  sharedLinks.map(({ url, linkAccessLevel }) => {
    return {
      id: url,
      email: null,
      domain: null,
      team_member_id: null,
      display_name: null,
      type: 'anyone' as DBXPermissionType,
      role: linkAccessLevel as sharing.LinkAccessLevel['.tag'],
      is_inherited: false,
      shared_link: url,
    };
  });
