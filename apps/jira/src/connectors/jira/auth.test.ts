/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { JiraError } from '../common/error';
import { getRefreshToken, getToken, getCloudId } from './auth';

const validCode = '1234';
const validRefreshToken = 'valid-refresh-token';
const accessToken = 'access-token-1234';
const refreshToken = 'refresh-token-1234';
const cloudId = 'some cloud id';
const expiresIn = 1234;

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.JIRA_APP_INSTALL_URL}/oauth/token`, async ({ request }) => {
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
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(JiraError);
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.JIRA_APP_INSTALL_URL}/oauth/token`, async ({ request }) => {
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
      await expect(getToken('wrong-refreshtoken')).rejects.toBeInstanceOf(JiraError);
    });
  });

  describe('getCloudId', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.JIRA_API_BASE_URL}/oauth/token/accessible-resources`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json([
            {
              id: cloudId,
            },
          ]);
        })
      );
    });

    test('should return the accessToken when the accessToken is valid', async () => {
      await expect(getCloudId(accessToken)).resolves.toStrictEqual({
        cloudId,
      });
    });

    test('should throw when the accessToken is invalid', async () => {
      await expect(getCloudId('wrong-token')).rejects.toBeInstanceOf(JiraError);
    });
  });
});
