import type { DataProtectionObject } from '@elba-security/sdk';
import type {
  ConfluenceOperationRestrictionUser,
  ConfluencePageRestrictions,
} from '@/connectors/confluence/page-restrictions';
import type { ConfluencePageWithRestrictions } from '@/connectors/confluence/pages';
import { organisationUsers } from './organisations';

const operationRestrictionUsers: ConfluenceOperationRestrictionUser[] = [
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- convenience
  ...organisationUsers.map(({ id, lastSyncAt, organisationId, ...user }) => ({
    accountType: 'atlassian' as const,
    accountId: id,
    ...user,
  })),
  {
    accountType: 'app',
    accountId: `app-id`,
    displayName: `an app`,
    publicName: `an app`,
  },
];

const pageRestrictions: ConfluencePageRestrictions[] = [
  {
    operation: 'read',
    restrictions: {
      user: {
        results: operationRestrictionUsers,
      },
    },
  },
  {
    operation: 'write',
    restrictions: {
      user: {
        results: operationRestrictionUsers,
      },
    },
  },
];

export const pageWithRestrictions: ConfluencePageWithRestrictions = {
  id: 'page-id',
  title: 'page title',
  _links: {
    webui: 'baz/biz',
  },
  spaceId: 'space-id',
  ownerId: 'owner-id',
  restrictions: pageRestrictions,
};

// this is a snapshot
export const pageWithRestrictionsObject: DataProtectionObject = {
  id: 'page-id',
  metadata: {
    objectType: 'page',
  },
  name: 'page title',
  ownerId: 'owner-id',
  permissions: [
    {
      displayName: 'display-name-0',
      id: '1234/space-id/page-id/account-0',
      metadata: {
        userId: 'account-0',
      },
      type: 'user',
      userId: 'account-0',
    },
    {
      displayName: 'display-name-1',
      id: '1234/space-id/page-id/account-1',
      metadata: {
        userId: 'account-1',
      },
      type: 'user',
      userId: 'account-1',
    },
    {
      displayName: 'display-name-2',
      id: '1234/space-id/page-id/account-2',
      metadata: {
        userId: 'account-2',
      },
      type: 'user',
      userId: 'account-2',
    },
    {
      displayName: 'display-name-3',
      id: '1234/space-id/page-id/account-3',
      metadata: {
        userId: 'account-3',
      },
      type: 'user',
      userId: 'account-3',
    },
    {
      displayName: 'display-name-4',
      id: '1234/space-id/page-id/account-4',
      metadata: {
        userId: 'account-4',
      },
      type: 'user',
      userId: 'account-4',
    },
    {
      displayName: 'display-name-5',
      id: '1234/space-id/page-id/account-5',
      metadata: {
        userId: 'account-5',
      },
      type: 'user',
      userId: 'account-5',
    },
    {
      displayName: 'display-name-6',
      id: '1234/space-id/page-id/account-6',
      metadata: {
        userId: 'account-6',
      },
      type: 'user',
      userId: 'account-6',
    },
    {
      displayName: 'display-name-7',
      id: '1234/space-id/page-id/account-7',
      metadata: {
        userId: 'account-7',
      },
      type: 'user',
      userId: 'account-7',
    },
    {
      displayName: 'display-name-8',
      id: '1234/space-id/page-id/account-8',
      metadata: {
        userId: 'account-8',
      },
      type: 'user',
      userId: 'account-8',
    },
    {
      displayName: 'display-name-9',
      id: '1234/space-id/page-id/account-9',
      metadata: {
        userId: 'account-9',
      },
      type: 'user',
      userId: 'account-9',
    },
    {
      displayName: 'an app',
      id: '1234/space-id/page-id/app-id',
      metadata: {
        userId: 'app-id',
      },
      type: 'user',
      userId: 'app-id',
    },
  ],
  url: 'http://foo.bar/baz/biz',
};
