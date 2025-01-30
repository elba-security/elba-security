import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import * as nangoAPI from '@/common/nango';
import * as authConnector from '@/connectors/confluence/auth';
import { usersTable } from '@/database/schema';
import * as groupsConnector from '@/connectors/confluence/groups';
import { env } from '@/common/env';
import { formatElbaUser } from '@/connectors/elba/users/users';
import { accessToken } from '../__mocks__/organisations';
import { syncGroupUsers } from './sync-group-users';

const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const organisationId = '00000000-0000-0000-0000-000000000001';
const instanceId = 'instance-id';

const syncStartedAt = Date.now();
const groupId = 'group-id';

// confluence members
const atlassianMembers: groupsConnector.ConfluenceGroupMember[] = Array.from(
  { length: 75 },
  (_, i) => ({
    accountId: `user-${i}`,
    accountType: 'atlassian',
    email: `user${i}@google.com`,
    displayName: `display name ${i}`,
    publicName: `public name ${i}`,
  })
);

const appMembers: groupsConnector.ConfluenceGroupMember[] = Array.from({ length: 75 }, (_, i) => ({
  accountId: `app-${i}`,
  accountType: 'app',
  email: null,
  displayName: `app ${i}`,
  publicName: `app ${i}`,
}));

const members = [...atlassianMembers, ...appMembers];

// users saved in db (more than we are going to retrieve)
const users = Array.from({ length: 100 }, (_, i) => ({
  id: `user-${i}`,
  displayName: `display name ${i}`,
  publicName: `public name ${i}`,
  organisationId,
  lastSyncAt: new Date(syncStartedAt - 1000),
}));

const setup = createInngestFunctionMock(
  syncGroupUsers,
  'confluence/users.group_users.sync.requested'
);

describe('sync-group-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: 'test-instance-id',
      url: 'test-instance-url',
    });
    const elba = spyOnElba();
    vi.spyOn(groupsConnector, 'getGroupMembers').mockResolvedValue({
      members: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      groupId,
      cursor: null,
      nangoConnectionId,
      region,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(groupsConnector.getGroupMembers).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when their is more group member', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: 'test-instance-id',
      url: 'test-instance-url',
    });
    const elba = spyOnElba();
    await db.insert(usersTable).values(users);
    vi.spyOn(groupsConnector, 'getGroupMembers').mockResolvedValue({
      members,
      cursor: 10,
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      groupId,
      cursor: null,
      nangoConnectionId,
      region,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toBeUndefined();

    expect(groupsConnector.getGroupMembers).toBeCalledTimes(1);
    expect(groupsConnector.getGroupMembers).toBeCalledWith({
      accessToken,
      instanceId,
      groupId,
      cursor: null,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: atlassianMembers.map(formatElbaUser),
    });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('request-next-group-users-sync', {
      function: syncGroupUsers,
      data: {
        organisationId,
        isFirstSync: false,
        syncStartedAt,
        groupId,
        cursor: 10,
      },
    });

    await expect(db.select().from(usersTable)).resolves.toHaveLength(users.length);
  });

  test('should finalize the sync when their is no more page', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPI, 'nangoAPIClient', 'get').mockReturnValue({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    });
    vi.spyOn(authConnector, 'getInstance').mockResolvedValue({
      id: 'test-instance-id',
      url: 'test-instance-url',
    });
    const elba = spyOnElba();
    await db.insert(usersTable).values(users);
    vi.spyOn(groupsConnector, 'getGroupMembers').mockResolvedValue({
      members,
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt,
      groupId,
      cursor: null,
      nangoConnectionId,
      region,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toBeUndefined();

    expect(groupsConnector.getGroupMembers).toBeCalledTimes(1);
    expect(groupsConnector.getGroupMembers).toBeCalledWith({
      accessToken,
      instanceId,
      groupId,
      cursor: null,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: atlassianMembers.map(formatElbaUser),
    });

    expect(step.invoke).toBeCalledTimes(0);

    await expect(db.select().from(usersTable)).resolves.toHaveLength(users.length);
  });
});
