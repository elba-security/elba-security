import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable, usersTable } from '@/database/schema';
import * as groupsConnector from '@/connectors/confluence/groups';
import { env } from '@/common/env';
import { accessToken, organisation } from '../__mocks__/organisations';
import { syncUsers } from './sync-users';
import { syncGroupUsers } from './sync-group-users';

const syncStartedAt = Date.now();

const users = Array.from({ length: 100 }, (_, i) => ({
  id: `user-${i}`,
  displayName: `display name ${i}`,
  publicName: `public name ${i}`,
  organisationId: organisation.id,
  lastSyncAt: new Date(syncStartedAt - 1000),
}));

const setup = createInngestFunctionMock(syncUsers, 'confluence/users.sync.requested');

describe('sync-users', () => {
  test('should abort sync when organisation is not registered', async () => {
    const elba = spyOnElba();
    vi.spyOn(groupsConnector, 'getGroupIds').mockResolvedValue({
      groupIds: [],
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(groupsConnector.getGroupIds).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
    expect(step.invoke).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when their is more groups', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    await db.insert(usersTable).values(users);
    vi.spyOn(groupsConnector, 'getGroupIds').mockResolvedValue({
      groupIds: Array.from({ length: 10 }, (_, i) => `group-${i}`),
      cursor: 10,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
      cursor: null,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toStrictEqual({
      status: 'ongoing',
    });

    expect(groupsConnector.getGroupIds).toBeCalledTimes(1);
    expect(groupsConnector.getGroupIds).toBeCalledWith({
      accessToken,
      instanceId: organisation.instanceId,
      cursor: null,
      limit: 25,
    });

    expect(step.invoke).toBeCalledTimes(10);
    for (let i = 0; i < 10; i++) {
      expect(step.invoke).toHaveBeenNthCalledWith(i + 1, `sync-group-users-group-${i}`, {
        function: syncGroupUsers,
        data: {
          isFirstSync: true,
          cursor: null,
          organisationId: organisation.id,
          syncStartedAt,
          groupId: `group-${i}`,
        },
        timeout: '0.5d',
      });
    }
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('request-next-groups-sync', {
      name: 'confluence/users.sync.requested',
      data: {
        organisationId: organisation.id,
        syncStartedAt,
        isFirstSync: true,
        cursor: 10,
      },
    });

    expect(elba).toBeCalledTimes(0);

    await expect(db.select().from(usersTable)).resolves.toHaveLength(users.length);
  });

  test('should finalize the sync when their is no more groups', async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);
    await db.insert(usersTable).values(users);
    vi.spyOn(groupsConnector, 'getGroupIds').mockResolvedValue({
      groupIds: Array.from({ length: 10 }, (_, i) => `group-${i}`),
      cursor: null,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      syncStartedAt,
      isFirstSync: true,
      cursor: 10,
    });
    step.invoke.mockResolvedValue(undefined);

    await expect(result).resolves.toStrictEqual({
      status: 'completed',
    });

    expect(groupsConnector.getGroupIds).toBeCalledTimes(1);
    expect(groupsConnector.getGroupIds).toBeCalledWith({
      accessToken,
      instanceId: organisation.instanceId,
      cursor: 10,
      limit: 25,
    });

    expect(step.invoke).toBeCalledTimes(10);

    for (let i = 0; i < 10; i++) {
      expect(step.invoke).toHaveBeenNthCalledWith(i + 1, `sync-group-users-group-${i}`, {
        function: syncGroupUsers,
        data: {
          isFirstSync: true,
          cursor: null,
          organisationId: organisation.id,
          syncStartedAt,
          groupId: `group-${i}`,
        },
        timeout: '0.5d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(0);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });

    await expect(db.select().from(usersTable)).resolves.toHaveLength(0);
  });
});
