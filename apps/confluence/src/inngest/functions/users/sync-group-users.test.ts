import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import * as groupsConnector from '@/connectors/confluence/groups';
import { env } from '@/common/env';
import { formatElbaUser } from '@/connectors/elba/users/users';
import { accessToken, organisation } from '../__mocks__/organisations';
import { syncGroupUsers } from './sync-group-users';

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
  organisationId: organisation.id,
  lastSyncAt: new Date(syncStartedAt - 1000),
}));

const setup = createInngestFunctionMock(
  syncGroupUsers,
  'confluence/users.group_users.sync.requested'
);

describe('sync-group-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(groupsConnector, 'getGroupMembers').mockResolvedValue({
      members: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      groupId,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(groupsConnector.getGroupMembers).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when their is more group member', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    await db.insert(usersTable).values(users);
    vi.spyOn(groupsConnector, 'getGroupMembers').mockResolvedValue({
      members,
      cursor: 10,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      groupId,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toBeUndefined();

    expect(groupsConnector.getGroupMembers).toBeCalledTimes(1);
    expect(groupsConnector.getGroupMembers).toBeCalledWith({
      accessToken,
      instanceId: organisation.instanceId,
      groupId,
      cursor: null,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
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
        organisationId: organisation.id,
        isFirstSync: false,
        syncStartedAt,
        groupId,
        cursor: 10,
      },
    });

    await expect(db.select().from(usersTable)).resolves.toHaveLength(users.length);
  });

  test('should finalize the sync when their is no more page', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    await db.insert(usersTable).values(users);
    vi.spyOn(groupsConnector, 'getGroupMembers').mockResolvedValue({
      members,
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt,
      groupId,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toBeUndefined();

    expect(groupsConnector.getGroupMembers).toBeCalledTimes(1);
    expect(groupsConnector.getGroupMembers).toBeCalledWith({
      accessToken,
      instanceId: organisation.instanceId,
      groupId,
      cursor: null,
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
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
