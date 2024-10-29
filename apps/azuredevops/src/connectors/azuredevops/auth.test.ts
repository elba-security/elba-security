import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { AzuredevopsError } from '../common/error';
import { getToken } from './auth';

const validAuthCode = 'valid-code';
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const expiresIn = '1234';

describe('getToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.AZUREDEVOPS_APP_INSTALL_URL}/oauth2/token`, async ({ request }) => {
        const body = await request.text();
        const searchParams = new URLSearchParams(body);
        const code = searchParams.get('assertion');
        if (code !== validAuthCode) {
          return new Response(undefined, { status: 401 });
        }
        return Response.json({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: expiresIn,
        });
      })
    );
  });

  test('should not throw when authorization code is valid', async () => {
    await expect(getToken(validAuthCode)).resolves.toStrictEqual({
      accessToken,
      refreshToken,
      expiresIn,
    });
  });

  test('should throw an error when authorization code is invalid', async () => {
    await expect(getToken('invalid-auth-code')).rejects.toThrowError(AzuredevopsError);
  });
});
