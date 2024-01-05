import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError, RetryAfterError } from 'inngest';
import { insertTestAccessToken } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { memberLinkedApps, membersLinkedAppFirstPage } from './__mocks__/member-linked-apps';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { refreshThirdPartyAppsObject } from './refresh-objects';

const organisationId = '00000000-0000-0000-0000-000000000001';

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsListMemberLinkedAppsMock: vi.fn(),
    updateObjects: vi.fn(),
  };
});

// Mock Dropbox sdk
vi.mock('@/repositories/dropbox/clients/DBXAccess', () => {
  const actual = vi.importActual('dropbox');
  return {
    ...actual,
    DBXAccess: vi.fn(() => {
      return {
        setHeaders: vi.fn(),
        teamLinkedAppsListMemberLinkedApps: mocks.teamLinkedAppsListMemberLinkedAppsMock,
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
        },
      };
    }),
  };
});

const setup = createInngestFunctionMock(
  refreshThirdPartyAppsObject,
  'third-party-apps/refresh-objects'
);

describe('third-party-apps-refresh-objects', () => {
  beforeEach(() => {
    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockReset();
    mocks.updateObjects.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    await insertTestAccessToken();

    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockRejectedValue(
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
      teamMemberId: 'team-member-id',
      isFirstScan: false,
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test("should not retry when the organisation's access token expired", async () => {
    await insertTestAccessToken();

    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockRejectedValue(
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
      teamMemberId: 'team-member-id',
      isFirstScan: false,
    });

    await expect(result).rejects.toStrictEqual(new NonRetriableError('expired_access_token/...'));
  });

  test.only('should fetch members apps send it tp elba(without pagination)', async () => {
    mocks.teamLinkedAppsListMemberLinkedAppsMock.mockImplementation(() => {
      return {
        result: {
          linked_api_apps: membersLinkedAppFirstPage.at(0)?.linked_api_apps,
        },
      };
    });

    const [result, { step }] = await setup({
      accessToken: 'access-token-1',
      organisationId,
      teamMemberId: 'team-member-id',
      isFirstScan: false,
    });

    await expect(step.run).toBeCalledTimes(1);
    await expect(mocks.updateObjects).toBeCalledTimes(1);
    await expect(mocks.updateObjects).toBeCalledWith(memberLinkedApps);

    expect(await result).toStrictEqual({
      success: true,
    });
  });
});
