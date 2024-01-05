import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { NonRetriableError, RetryAfterError } from 'inngest';
import { insertTestAccessToken } from '@/common/__mocks__/token';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { deleteThirdPartyAppsObject } from './delete-object';

const mocks = vi.hoisted(() => {
  return {
    teamLinkedAppsRevokeLinkedAppMock: vi.fn(),
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
        teamLinkedAppsRevokeLinkedApp: mocks.teamLinkedAppsRevokeLinkedAppMock,
      };
    }),
  };
});

const setup = createInngestFunctionMock(
  deleteThirdPartyAppsObject,
  'third-party-apps/delete-object'
);

describe('third-party-apps-delete-objects', () => {
  beforeEach(() => {
    mocks.teamLinkedAppsRevokeLinkedAppMock.mockReset();
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  test('should delay the job when Dropbox rate limit is reached', async () => {
    await insertTestAccessToken();

    mocks.teamLinkedAppsRevokeLinkedAppMock.mockRejectedValue(
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
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });

    await expect(result).rejects.toStrictEqual(
      new RetryAfterError('Dropbox rate limit reached', Number(5 * 1000))
    );
  });

  test("should not retry when the organisation's access token expired", async () => {
    await insertTestAccessToken();

    mocks.teamLinkedAppsRevokeLinkedAppMock.mockRejectedValue(
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
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });

    await expect(result).rejects.toStrictEqual(new NonRetriableError('expired_access_token/...'));
  });

  test('should delete the member third party app', async () => {
    mocks.teamLinkedAppsRevokeLinkedAppMock.mockResolvedValue({});

    const [result, { step }] = await setup({
      accessToken: 'access-token-1',
      teamMemberId: 'team-member-id',
      appId: 'app-id',
    });

    expect(await result).toStrictEqual({
      success: true,
    });
    await expect(step.run).toBeCalledTimes(1);
    await expect(mocks.teamLinkedAppsRevokeLinkedAppMock).toBeCalledTimes(1);
  });
});
