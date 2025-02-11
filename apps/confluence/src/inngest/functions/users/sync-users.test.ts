import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as groupsConnector from '@/connectors/confluence/groups';
import { env } from '@/common/env';
import * as nangoAPI from '@/common/nango';
import * as authConnector from '@/connectors/confluence/auth';
import { accessToken } from '../__mocks__/organisations';
import { syncUsers } from './sync-users';
import { syncGroupUsers } from './sync-group-users';

const region = 'us';
const nangoConnectionId = 'nango-connection-id';
const organisationId = '00000000-0000-0000-0000-000000000001';
const instanceId = 'test-instance-id';

const syncStartedAt = Date.now();

const setup = createInngestFunctionMock(syncUsers, 'confluence/users.sync.requested');

describe('sync-users', () => {
  test('should continue the sync when their is more groups', async () => {
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
    vi.spyOn(groupsConnector, 'getGroupIds').mockResolvedValue({
      groupIds: Array.from({ length: 10 }, (_, i) => `group-${i}`),
      cursor: 10,
    });

    const [result, { step }] = setup({
      nangoConnectionId,
      region,
      organisationId,
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
      instanceId,
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
          organisationId,
          syncStartedAt,
          groupId: `group-${i}`,
          nangoConnectionId,
          region,
        },
        timeout: '0.5d',
      });
    }
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('request-next-groups-sync', {
      name: 'confluence/users.sync.requested',
      data: {
        organisationId,
        syncStartedAt,
        isFirstSync: true,
        cursor: 10,
        nangoConnectionId,
        region,
      },
    });

    expect(elba).toBeCalledTimes(0);
  });

  test('should finalize the sync when their is no more groups', async () => {
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
    vi.spyOn(groupsConnector, 'getGroupIds').mockResolvedValue({
      groupIds: Array.from({ length: 10 }, (_, i) => `group-${i}`),
      cursor: null,
    });

    const [result, { step }] = setup({
      nangoConnectionId,
      region,
      organisationId,
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
      instanceId,
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
          organisationId,
          syncStartedAt,
          groupId: `group-${i}`,
          nangoConnectionId,
          region,
        },
        timeout: '0.5d',
      });
    }

    expect(step.sendEvent).toBeCalledTimes(0);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: new Date(syncStartedAt).toISOString(),
    });
  });
});
