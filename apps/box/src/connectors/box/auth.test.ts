import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env/server';
import { BoxError } from '../common/error';
import { getRefreshToken, getToken, getAuthUser } from './auth';

const validCode = '1234';
const validRefreshToken = 'valid-refresh-token';
const accessToken = 'access-token-1234';
const refreshToken = 'refresh-token-1234';
const expiresIn = '1234';
const validToken = 'test-valid-token';
const invalidToken = 'foo-bar';
const authUserId = 'test-auth-user-id';

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.BOX_API_BASE_URL}/oauth2/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const code = searchParams.get('code');

          if (grantType !== 'authorization_code' || code !== validCode) {
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

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(BoxError);
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.BOX_API_BASE_URL}/oauth2/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const token = searchParams.get('refresh_token');

          if (grantType !== 'refresh_token' || token !== validRefreshToken) {
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

    test('should return the refreshToken when the refreshToken is valid', async () => {
      await expect(getRefreshToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(getToken('wrong-refreshtoken')).rejects.toBeInstanceOf(BoxError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.BOX_API_BASE_URL}/2.0/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const responseData = {
            id: authUserId,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        authUserId,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUser(invalidToken)).rejects.toBeInstanceOf(BoxError);
    });
  });
});
