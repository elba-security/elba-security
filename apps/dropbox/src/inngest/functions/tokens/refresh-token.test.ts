import { expect, test, describe, vi, beforeEach, afterAll } from 'vitest';
import { refreshToken } from './refresh-token';
import { DropboxResponseError } from 'dropbox';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import addSeconds from 'date-fns/addSeconds';
import { insertOrganisations } from '@/test-utils/token';
import * as crypto from '@/common/crypto';
import { subMinutes } from 'date-fns';

const TOKEN_GENERATED_AT = '2023-03-13T16:19:20.818Z';
const TOKEN_WILL_EXPIRE_IN = 14400;
const TOKEN_EXPIRES_AT = addSeconds(new Date(TOKEN_GENERATED_AT), TOKEN_WILL_EXPIRE_IN);
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(refreshToken, 'dropbox/token.refresh.triggered');

const mocks = vi.hoisted(() => {
  return {
    refreshAccessToken: vi.fn(),
  };
});

vi.mock('@/connectors/dropbox/dbx-auth', () => {
  return {
    DBXAuth: vi.fn().mockImplementation(() => {
      return {
        refreshAccessToken: mocks.refreshAccessToken,
      };
    }),
  };
});

describe('refreshToken', () => {
  beforeEach(async () => {
    vi.setSystemTime(TOKEN_GENERATED_AT);
    vi.clearAllMocks();
    await insertOrganisations({});
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should delete the organisations and call elba to notify', async () => {
    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');
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
    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');

    mocks.refreshAccessToken.mockResolvedValueOnce({
      access_token: 'test-access-token-0',
      expires_at: TOKEN_EXPIRES_AT,
    });

    const [result, { step }] = setup({
      organisationId,
    });

    await expect(result).resolves.toStrictEqual({
      status: 'completed',
    });
    expect(crypto.encrypt).toBeCalledTimes(1);
    expect(crypto.encrypt).toBeCalledWith('test-access-token-0');
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('dropbox-refresh-token', {
      name: 'dropbox/token.refresh.triggered',
      data: {
        organisationId,
      },
      ts: subMinutes(new Date(TOKEN_EXPIRES_AT), 30).getTime(),
    });
  });
});
