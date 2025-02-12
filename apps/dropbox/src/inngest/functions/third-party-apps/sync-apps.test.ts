import { describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import * as nangoAPIClient from '@/common/nango';
import * as appsConnector from '@/connectors/dropbox/apps';
import { createLinkedApps } from './__mocks__/member-linked-apps';
import { syncApps } from './sync-apps';

const organisationId = '00000000-0000-0000-0000-000000000001';
const region = 'us';
const nangoConnectionId = 'nango-connection-id';

const now = new Date('2021-01-01T00:00:00.000Z').getTime();

const setup = createInngestFunctionMock(syncApps, 'dropbox/third_party_apps.sync.requested');

describe('syncApps', () => {
  test('should call elba delete event if the members apps length is 0', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: [],
      nextCursor: null,
    });

    const [result] = setup({
      organisationId: '00000000-0000-0000-0000-000000000001',
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
  });

  test('should fetch members apps send it to elba(without pagination)', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(nangoAPIClient, 'nangoAPIClient', 'get').mockImplementation(() => ({
      getConnection: vi.fn().mockResolvedValue({
        credentials: { access_token: 'access-token' },
      }),
    }));
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: createLinkedApps({
        length: 2,
        startFrom: 0,
      }).membersApps,
      nextCursor: null,
    });

    const [result] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toBeUndefined();
  });

  test('should fetch members apps and invoke next event to fetch the next page', async () => {
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: createLinkedApps({
        length: 2,
        startFrom: 0,
      }).membersApps,
      nextCursor: 'next-cursor-1',
    });

    const [result, { step }] = setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
      nangoConnectionId,
      region,
    });

    await expect(result).resolves.toEqual({
      status: 'ongoing',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('list-next-page-apps', {
      name: 'dropbox/third_party_apps.sync.requested',
      data: {
        cursor: 'next-cursor-1',
        isFirstSync: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: 1609459200000,
        nangoConnectionId,
        region,
      },
    });
  });
});
