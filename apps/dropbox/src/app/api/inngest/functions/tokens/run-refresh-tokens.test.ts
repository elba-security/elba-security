import { expect, test, describe, vi, beforeAll, beforeEach } from 'vitest';
import { runRefreshToken } from './run-refresh-tokens';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import addSeconds from 'date-fns/addSeconds';
import { insertOrganisations } from '@/common/__mocks__/token';

const TOKEN_GENERATED_AT = '2023-03-13T16:19:20.818Z';
const TOKEN_WILL_EXPIRE_IN = 14400; // seconds
const TOKEN_EXPIRES_AT = addSeconds(new Date(TOKEN_GENERATED_AT), TOKEN_WILL_EXPIRE_IN);
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(runRefreshToken, 'tokens/run-refresh-token');

const mocks = vi.hoisted(() => {
  return {
    refreshAccessToken: vi.fn(),
  };
});

vi.mock('@/repositories/dropbox/clients/dbx-auth', () => {
  return {
    DBXAuth: vi.fn().mockImplementation(() => {
      return {
        refreshAccessToken: mocks.refreshAccessToken,
      };
    }),
  };
});

describe('run-refresh-token', () => {
  beforeEach(async () => {
    mocks.refreshAccessToken.mockReset();
    await insertOrganisations({});
  });

  beforeAll(() => {
    vi.clearAllMocks();
  });

  test('should delete the organisations and call elba to notify', async () => {
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

    const [result] = setup({
      organisationId,
    });

    await expect(result).rejects.toBeInstanceOf(DropboxResponseError);
  });

  test('should refresh tokens for the available organisation', async () => {
    mocks.refreshAccessToken.mockResolvedValueOnce({
      access_token: 'test-access-token-0',
      expires_at: TOKEN_EXPIRES_AT,
    });

    const [result] = setup({
      organisationId,
    });

    await expect(result).resolves.toStrictEqual({
      success: true,
    });
  });
});
