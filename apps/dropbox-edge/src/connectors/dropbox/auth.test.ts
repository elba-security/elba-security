import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';
import { getRefreshToken, getToken } from './auth';

const validCode = '1234';
const token = {
  access_token: 'token-1234',
  refresh_token: 'refresh-token-1234',
  expires_in: 3600,
};

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.DROPBOX_API_BASE_URL}/oauth2/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const code = searchParams.get('code');

          if (grantType !== 'authorization_code' || code !== validCode) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(token);
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresIn: token.expires_in,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(DropboxError);
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.DROPBOX_API_BASE_URL}/oauth2/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const refreshToken = searchParams.get('refresh_token');

          if (grantType !== 'refresh_token' || refreshToken !== token.refresh_token) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(token);
        })
      );
    });

    test('should return the token when the refresh token is valid', async () => {
      await expect(getRefreshToken(token.refresh_token)).resolves.toStrictEqual({
        accessToken: token.access_token,
        expiresIn: token.expires_in,
      });
    });

    test('should throw when the refresh token is invalid', async () => {
      await expect(getRefreshToken('wrong-refresh-token')).rejects.toBeInstanceOf(DropboxError);
    });
  });
});
