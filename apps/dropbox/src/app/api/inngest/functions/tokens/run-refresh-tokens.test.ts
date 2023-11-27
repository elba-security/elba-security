import { expect, test, describe, vi, beforeAll, beforeEach } from 'vitest';
import { addMinutes } from 'date-fns';
import { mockInngestFunction } from '@/common/__mocks__/inngest';
import { runRefreshToken } from './run-refresh-tokens';
import { DropboxResponseError } from 'dropbox';

const TOKEN_GENERATED_AT = '2023-03-13T16:19:20.818Z';
const TOKEN_WILL_EXPIRE_IN = 240; // minutes
const TOKEN_EXPIRES_AT = addMinutes(new Date(TOKEN_GENERATED_AT), TOKEN_WILL_EXPIRE_IN);

const mocks = vi.hoisted(() => {
  return {
    refreshAccessToken: vi.fn(),
  };
});

vi.mock('@/repositories/dropbox/clients/DBXAuth', () => {
  return {
    DBXAuth: vi.fn().mockImplementation(() => {
      return {
        refreshAccessToken: mocks.refreshAccessToken,
      };
    }),
  };
});

describe('run-refresh-tokens', () => {
  beforeEach(async () => {
    mocks.refreshAccessToken.mockReset();
  });

  beforeAll(async () => {
    vi.clearAllMocks();
  });

  test('should refresh later when there is dropbox unauthorized issue', async () => {
    mocks.refreshAccessToken.mockRejectedValueOnce(
      new DropboxResponseError(
        401,
        {},
        {
          error_summary: 'user_suspended/...',
          error: {
            '.tag': 'user_suspended',
          },
        }
      )
    );

    const { result, step } = mockInngestFunction(runRefreshToken, {
      organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
      refreshToken: 'test-refresh-token-0',
    });

    await expect(result).resolves.toStrictEqual({
      success: true,
    });
  });

  test.only('should refresh tokens for the available organisation', async () => {
    mocks.refreshAccessToken.mockResolvedValueOnce({
      access_token: 'test-access-token-0',
      expires_at: TOKEN_EXPIRES_AT,
    });

    const { result } = mockInngestFunction(runRefreshToken, {
      organisationId: 'b0771747-caf0-487d-a885-5bc3f1e9f770',
      refreshToken: 'test-refresh-token-0',
    });

    await expect(result).resolves.toStrictEqual({
      success: true,
    });
  });
});
