import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DropboxResponseError } from 'dropbox';
import * as crypto from '@/common/crypto';
import { linkedApps, membersLinkedAppFirstPage } from './__mocks__/member-linked-apps';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { insertOrganisations } from '@/test-utils/token';
import { syncApps } from './sync-apps';
import { db } from '@/database/client';
import { organisations } from '@/database';
import { NonRetriableError } from 'inngest';

const organisationId = '00000000-0000-0000-0000-000000000001';

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsListMembersLinkedAppsMock: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-access', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamLinkedAppsListMembersLinkedApps: mocks.teamLinkedAppsListMembersLinkedAppsMock,
      };
    }),
  };
});

const setup = createInngestFunctionMock(syncApps, 'dropbox/third_party_apps.sync_page.triggered');

describe('run-user-sync-jobs', () => {
  beforeEach(async () => {
    await db.delete(organisations);
    await insertOrganisations({});
    vi.clearAllMocks();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  test('should abort sync when organisation is not registered', async () => {
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {});

    const elba = spyOnElba();
    const [result, { step }] = await setup({
      organisationId: '00000000-0000-0000-0000-000000000010',
      userId: 'team-member-id',
      appId: 'app-id',
      isFirstSync: false,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(mocks.teamLinkedAppsListMembersLinkedAppsMock).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockRejectedValue(
      new DropboxResponseError(
        429,
        {},
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
            retry_after: 300,
          },
        }
      )
    );

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test("should not retry when the organisation's access token expired", async () => {
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockRejectedValue(
      new DropboxResponseError(
        401,
        {},
        {
          error_summary: 'expired_access_token/...',
          error: {
            '.tag': 'expired_access_token',
          },
        }
      )
    );

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should call elba delete event if the members apps length is 0', async () => {
    const elba = spyOnElba();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          apps: [],
          has_more: false,
        },
      };
    });

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: '2021-01-01T00:00:00.000Z',
    });
  });

  test('should fetch members apps send it to elba(without pagination)', async () => {
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          cursor: 'cursor-1',
          has_more: false,
          apps: membersLinkedAppFirstPage,
        },
      };
    });

    const [result] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith(linkedApps);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: '2021-01-01T00:00:00.000Z',
    });
  });

  test('should fetch members apps send it tp elba(with pagination)', async () => {
    const elba = spyOnElba();
    mocks.teamLinkedAppsListMembersLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          cursor: 'cursor-1',
          has_more: true,
          apps: membersLinkedAppFirstPage,
        },
      };
    });

    const [result, { step }] = await setup({
      organisationId,
      isFirstSync: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: 'https://api.elba.io',
      apiKey: 'elba-api-key',
      organisationId,
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('third-party-apps-run-sync-jobs', {
      name: 'dropbox/third_party_apps.sync_page.triggered',
      data: {
        cursor: 'cursor-1',
        isFirstSync: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
    });

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith(linkedApps);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(0);
  });
});
