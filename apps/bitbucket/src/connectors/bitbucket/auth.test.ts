import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { BitbucketError } from '../common/error';
import { getAccessToken } from './auth';

const validAuthCode = 'valid-code';
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const expiresIn = 1234;

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.BITBUCKET_APP_INSTALL_URL}/access_token`, async ({ request }) => {
        const body = await request.text();
        const searchParams = new URLSearchParams(body);
        const code = searchParams.get('code');
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
    await expect(getAccessToken(validAuthCode)).resolves.toStrictEqual({
      accessToken,
      refreshToken,
      expiresIn,
    });
  });

  test('should throw an error when authorization code is invalid', async () => {
    await expect(getAccessToken('invalid-auth-code')).rejects.toThrowError(BitbucketError);
  });
});
