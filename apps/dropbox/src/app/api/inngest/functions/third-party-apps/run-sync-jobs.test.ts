import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError, RetryAfterError } from 'inngest';
import { insertTestAccessToken } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { runThirdPartyAppsSyncJobs } from './run-sync-jobs';
import { linkedApps, membersLinkedAppFirstPage } from './__mocks__/member-linked-apps';
import { createInngestFunctionMock } from '@elba-security/test-utils';

const organisationId = '00000000-0000-0000-0000-000000000001';

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsListMembersLinkedApps: vi.fn(),
    updateObjects: vi.fn(),
    deleteObjects: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/repositories/dropbox/clients/DBXAccess', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(() => {}),
        teamLinkedAppsListMembersLinkedApps: mocks.teamLinkedAppsListMembersLinkedApps,
      };
    }),
  };
});

vi.mock('@elba-security/sdk', () => {
  return {
    Elba: vi.fn(() => {
      return {
        thirdPartyApps: {
          updateObjects: mocks.updateObjects,
          deleteObjects: mocks.deleteObjects,
        },
      };
    }),
  };
});

const setup = createInngestFunctionMock(
  runThirdPartyAppsSyncJobs,
  'third-party-apps/run-sync-jobs'
);

describe('run-user-sync-jobs', () => {
  beforeEach(() => {
    mocks.teamLinkedAppsListMembersLinkedApps.mockReset();
    mocks.updateObjects.mockReset();
    mocks.deleteObjects.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    await insertTestAccessToken();

    mocks.teamLinkedAppsListMembersLinkedApps.mockRejectedValue(
      new DropboxResponseError(
        429,
        {
          'Retry-After': '5',
        },
        {
          error_summary: 'too_many_requests/...',
          error: {
            '.tag': 'too_many_requests',
          },
        }
      )
    );

    const [result] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test("should not retry when the organisation's access token expired", async () => {
    await insertTestAccessToken();

    mocks.teamLinkedAppsListMembersLinkedApps.mockRejectedValue(
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
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toStrictEqual(new NonRetriableError('expired_access_token/...'));
  });

  test('should call elba delete event if the members apps length is 0', async () => {
    mocks.teamLinkedAppsListMembersLinkedApps.mockImplementation(() => {
      return {
        result: {
          apps: [],
          has_more: false,
        },
      };
    });

    const [result] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(mocks.updateObjects).toBeCalledTimes(0);
    expect(mocks.deleteObjects).toBeCalledTimes(1);
    expect(mocks.deleteObjects).toBeCalledWith({
      syncedBefore: '2021-01-01T00:00:00.000Z',
    });
  });

  test('should fetch members apps send it tp elba(without pagination)', async () => {
    mocks.teamLinkedAppsListMembersLinkedApps.mockImplementation(() => {
      return {
        result: {
          cursor: 'cursor-1',
          has_more: false,
          apps: membersLinkedAppFirstPage,
        },
      };
    });

    const [result] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(mocks.updateObjects).toBeCalledTimes(1);
    expect(mocks.updateObjects).toBeCalledWith(linkedApps);
    expect(mocks.deleteObjects).toBeCalledTimes(1);
    expect(mocks.deleteObjects).toBeCalledWith({
      syncedBefore: '2021-01-01T00:00:00.000Z',
    });
  });

  test('should fetch members apps send it tp elba(with pagination)', async () => {
    mocks.teamLinkedAppsListMembersLinkedApps.mockImplementation(() => {
      return {
        result: {
          cursor: 'cursor-1',
          has_more: true,
          apps: membersLinkedAppFirstPage,
        },
      };
    });

    const [result, { step }] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      isFirstScan: false,
      syncStartedAt: '2021-01-01T00:00:00.000Z',
      cursor: 'cursor-1',
    });

    await expect(result).resolves.toStrictEqual({
      success: true,
    });

    // Call again to fetch the next page
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('third-party-apps-run-sync-jobs', {
      name: 'third-party-apps/run-sync-jobs',
      data: {
        accessToken: 'access-token-1',
        cursor: 'cursor-1',
        isFirstScan: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: '2021-01-01T00:00:00.000Z',
      },
    });

    expect(await result).toStrictEqual({
      success: true,
    });

    expect(mocks.updateObjects).toBeCalledTimes(1);
    expect(mocks.updateObjects).toBeCalledWith(linkedApps);
  });
});
