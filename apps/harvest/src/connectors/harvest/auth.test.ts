/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { HarvestError } from '../common/error';
import { getToken, getAccountIds, getRefreshToken } from './auth';

const validCode = '1234';
const invalidCode = 'invalid-code';
const accessToken = 'access-token-1234';
const invalidToken = 'invalid-token';
const accountId = 100000;
const validRefreshToken = 'valid-refresh-token';
const expiresIn = 12345678;

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.HARVEST_APP_INSTALL_URL}/api/v2/oauth2/token`, async ({ request }) => {
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
      await expect(getToken(invalidCode)).rejects.toBeInstanceOf(HarvestError);
    });
  });

  describe('getAccountIds', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.HARVEST_APP_INSTALL_URL}/api/v2/accounts`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            accounts: [
              {
                id: accountId,
              },
            ],
          });
        })
      );
    });

    test('should return the accountIds when the accessToken is valid', async () => {
      await expect(getAccountIds({ accessToken })).resolves.toStrictEqual([String(accountId)]);
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(getAccountIds({ accessToken: invalidToken })).rejects.toBeInstanceOf(
        HarvestError
      );
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.HARVEST_APP_INSTALL_URL}/api/v2/oauth2/token`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const grantType = searchParams.get('grant_type');
          const token = searchParams.get('refresh_token');

          if (grantType !== 'refresh_token' || token !== validRefreshToken) {
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

    test('should return the refreshToken when the refreshToken is valid', async () => {
      await expect(getRefreshToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken: validRefreshToken,
        expiresIn,
      });
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(getToken('wrong-refreshtoken')).rejects.toBeInstanceOf(HarvestError);
    });
  });
});
