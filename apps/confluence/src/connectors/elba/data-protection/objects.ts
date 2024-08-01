import type { DataProtectionObject, DataProtectionObjectPermission } from '@elba-security/sdk';
import type { ConfluencePageWithRestrictions } from '@/connectors/confluence/pages';
import type { ConfluenceSpaceWithPermissions } from '@/connectors/confluence/spaces';
import type { ConfluenceOperationRestrictionUser } from '@/connectors/confluence/page-restrictions';
import type {
  PageObjectMetadata,
  PageObjectPermissionMetadata,
  SpaceObjectMetadata,
  SpaceObjectPermissionMetadata,
} from './metadata';

type FormatObjectOptions = {
  instanceUrl: string;
  instanceId: string;
};

const formatPageRestrictionsPermissions = (
  page: ConfluencePageWithRestrictions,
  options: FormatObjectOptions
): DataProtectionObjectPermission[] => {
  const unfilteredUsers = page.restrictions.flatMap(
    ({ restrictions }) => restrictions.user.results
  );

  const users = new Map<string, ConfluenceOperationRestrictionUser>();
  for (const user of unfilteredUsers) {
    if (users.has(user.accountId)) {
      continue;
    }
    users.set(user.accountId, user);
  }

  return Array.from(users.values()).map<DataProtectionObjectPermission>((user) => ({
    id: [options.instanceId, page.spaceId, page.id, user.accountId].join('/'),
    userId: user.accountId,
    metadata: {
      userId: user.accountId,
    } satisfies PageObjectPermissionMetadata,
    type: 'user',
    displayName: user.displayName || user.publicName,
  }));
};

export const formatPageObject = (
  page: ConfluencePageWithRestrictions,
  options: FormatObjectOptions
): DataProtectionObject => ({
  id: page.id,
  ownerId: page.ownerId,
  name: page.title,
  url: `${options.instanceUrl}/wiki${page._links.webui}`,
  metadata: {
    objectType: 'page',
  } satisfies PageObjectMetadata,
  permissions: formatPageRestrictionsPermissions(page, options),
});

type FormatSpaceObjectOptions = FormatObjectOptions & {
  users: Map<string, { displayName: string | null; publicName: string }>;
};

const formatSpacePermissions = (
  space: ConfluenceSpaceWithPermissions,
  options: FormatSpaceObjectOptions
) => {
  const permissions = new Map<string, DataProtectionObjectPermission>();

  for (const spacePermission of space.permissions) {
    const id = [options.instanceId, space.id, spacePermission.principal.id].join('/');
    const permission = permissions.get(id);
    const user = options.users.get(spacePermission.principal.id);

    if (permission) {
      // keeping track of each space permissions for the user
      (permission.metadata as SpaceObjectPermissionMetadata).ids.push(spacePermission.id);
    } else if (
      spacePermission.principal.type === 'role' &&
      spacePermission.principal.id === 'ANONYMOUS'
    ) {
      permissions.set(id, {
        id,
        type: 'anyone',
        metadata: {
          ids: [spacePermission.id],
        } satisfies SpaceObjectPermissionMetadata,
      });
    } else if (user && spacePermission.principal.type === 'user') {
      permissions.set(id, {
        type: 'user',
        id,
        userId: spacePermission.principal.id,
        displayName: user.displayName || user.publicName,
        metadata: {
          ids: [spacePermission.id],
        } satisfies SpaceObjectPermissionMetadata,
      });
    }
  }

  return Array.from(permissions.values());
};

export const formatSpaceObject = (
  space: ConfluenceSpaceWithPermissions,
  options: FormatSpaceObjectOptions
): DataProtectionObject => ({
  id: space.id,
  ownerId: space.authorId,
  name: space.name,
  url: `${options.instanceUrl}/wiki${space._links.webui}`,
  metadata: {
    objectType: 'space',
    key: space.key,
    type: space.type,
  } satisfies SpaceObjectMetadata,
  permissions: formatSpacePermissions(space, options),
});
