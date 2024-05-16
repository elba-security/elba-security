import type { DataProtectionObject } from '@elba-security/sdk';
import type { ConfluenceSpacePermission } from '@/connectors/confluence/space-permissions';
import type { ConfluenceSpaceWithPermissions } from '@/connectors/confluence/spaces';
import { organisationUsers } from './organisations';

const registeredUserPermissions: ConfluenceSpacePermission[] = organisationUsers.flatMap(
  (user, i) => [
    {
      id: `registered-user-permission-${i}-1`,
      principal: {
        type: 'user' as const,
        id: user.id,
      },
    },
    {
      id: `registered-user-permission-${i}-2`,
      principal: {
        type: 'user' as const,
        id: user.id,
      },
    },
  ]
);

export const userPermissions: ConfluenceSpacePermission[] = registeredUserPermissions
  // theses permissions should not be sent to elba
  // we need a display name in the user permission so if the permission's user has not been synced
  // the permission cannot be sent
  .concat(
    Array.from({ length: 15 }, (_, i) => ({
      id: `unregistered-user-permission-${i}`,
      principal: {
        type: 'user' as const,
        id: `unregistered-account-${i}`,
      },
    }))
  );

export const anonymousPermissions: ConfluenceSpacePermission[] = [
  {
    id: `permission-anonymous-1`,
    principal: {
      type: 'user',
      id: 'ANONYMOUS',
    },
  },
  {
    id: `permission-anonymous-2`,
    principal: {
      type: 'user',
      id: 'ANONYMOUS',
    },
  },
];

// theses permissions should not be sent to elba
export const groupPermissions: ConfluenceSpacePermission[] = Array.from({ length: 15 }, (_, i) => ({
  id: `group-permission-${i}`,
  principal: {
    type: 'group' as const,
    id: `group-${i}`,
  },
}));

export const spaceWithPermissions: ConfluenceSpaceWithPermissions = {
  id: 'space-id',
  key: 'space-key',
  name: 'le space',
  authorId: 'author-id',
  type: 'global',
  _links: {
    webui: 'baz/biz',
  },
  permissions: [...userPermissions, ...groupPermissions, ...anonymousPermissions],
};

// this is a snapshot
export const spaceWithPermissionsObject: DataProtectionObject = {
  id: 'space-id',
  metadata: {
    key: 'space-key',
    objectType: 'space',
    type: 'global',
  },
  name: 'le space',
  ownerId: 'author-id',
  permissions: [
    {
      displayName: 'display-name-0',
      id: '1234/space-id/account-0',
      metadata: {
        ids: ['registered-user-permission-0-1', 'registered-user-permission-0-2'],
      },
      type: 'user',
      userId: 'account-0',
    },
    {
      displayName: 'display-name-1',
      id: '1234/space-id/account-1',
      metadata: {
        ids: ['registered-user-permission-1-1', 'registered-user-permission-1-2'],
      },
      type: 'user',
      userId: 'account-1',
    },
    {
      displayName: 'display-name-2',
      id: '1234/space-id/account-2',
      metadata: {
        ids: ['registered-user-permission-2-1', 'registered-user-permission-2-2'],
      },
      type: 'user',
      userId: 'account-2',
    },
    {
      displayName: 'display-name-3',
      id: '1234/space-id/account-3',
      metadata: {
        ids: ['registered-user-permission-3-1', 'registered-user-permission-3-2'],
      },
      type: 'user',
      userId: 'account-3',
    },
    {
      displayName: 'display-name-4',
      id: '1234/space-id/account-4',
      metadata: {
        ids: ['registered-user-permission-4-1', 'registered-user-permission-4-2'],
      },
      type: 'user',
      userId: 'account-4',
    },
    {
      displayName: 'display-name-5',
      id: '1234/space-id/account-5',
      metadata: {
        ids: ['registered-user-permission-5-1', 'registered-user-permission-5-2'],
      },
      type: 'user',
      userId: 'account-5',
    },
    {
      displayName: 'display-name-6',
      id: '1234/space-id/account-6',
      metadata: {
        ids: ['registered-user-permission-6-1', 'registered-user-permission-6-2'],
      },
      type: 'user',
      userId: 'account-6',
    },
    {
      displayName: 'display-name-7',
      id: '1234/space-id/account-7',
      metadata: {
        ids: ['registered-user-permission-7-1', 'registered-user-permission-7-2'],
      },
      type: 'user',
      userId: 'account-7',
    },
    {
      displayName: 'display-name-8',
      id: '1234/space-id/account-8',
      metadata: {
        ids: ['registered-user-permission-8-1', 'registered-user-permission-8-2'],
      },
      type: 'user',
      userId: 'account-8',
    },
    {
      displayName: 'display-name-9',
      id: '1234/space-id/account-9',
      metadata: {
        ids: ['registered-user-permission-9-1', 'registered-user-permission-9-2'],
      },
      type: 'user',
      userId: 'account-9',
    },
  ],
  url: 'http://foo.bar/baz/biz',
};
