/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';
import { getToken, getWorkspaceIds, getRefreshToken } from './auth';

const validCode = '1234';
const accessToken = 'access-token-1234';
const validRefreshToken = 'valid-refresh-token';
const invalidToken = 'invalid-token';
const workspaceId = '000000';
const expiresIn = 1234;

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.ASANA_APP_INSTALL_URL}/oauth_token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);
          const grantType = searchParams.get('grant_type');
          const code = searchParams.get('code');

          if (grantType !== 'authorization_code' || code !== validCode) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            access_token: accessToken,
            refresh_token: validRefreshToken,
            expires_in: expiresIn,
          });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken,
        refreshToken: validRefreshToken,
        expiresIn,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(AsanaError);
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.ASANA_APP_INSTALL_URL}/oauth_token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const token = searchParams.get('refresh_token');

          if (grantType !== 'refresh_token' || token !== validRefreshToken) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            access_token: accessToken,
            expires_in: expiresIn,
          });
        })
      );
    });

    test('should return the new access token when the refreshToken is valid', async () => {
      await expect(getRefreshToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        expiresIn,
      });
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(getToken('wrong-refreshtoken')).rejects.toBeInstanceOf(AsanaError);
    });
  });

  describe('getWorkspaceIds', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.ASANA_API_BASE_URL}/workspaces`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: [
              {
                gid: workspaceId,
              },
            ],
          });
        })
      );
    });

    test('should return the workspaceIds when the accessToken is valid', async () => {
      await expect(getWorkspaceIds(accessToken)).resolves.toStrictEqual([workspaceId]);
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(getWorkspaceIds(invalidToken)).rejects.toBeInstanceOf(AsanaError);
    });
  });
});
