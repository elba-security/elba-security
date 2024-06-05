/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SentryError } from '../common/error';
import { getToken, getRefreshToken } from './auth';

const validCode = '1234';
const accessToken = 'access-token-1234';
const validRefreshToken = 'valid-refresh-token';
const expiresAt = '2100-01-01T00:00:00.000Z';
const installationId = 'test-installation-id';
type GetTokenRequestData = {
  grant_type: string;
  code: string;
};
type GetRefreshTokenRequestData = {
  grant_type: string;
  refresh_token: string;
};
describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(
          `${env.SENTRY_API_BASE_URL}/sentry-app-installations/${installationId}/authorizations/`,
          async ({ request }) => {
            const body = (await request.json()) as GetTokenRequestData;
            const searchParams = new URLSearchParams(body);

            const grantType = searchParams.get('grant_type');
            const code = searchParams.get('code');
            if (grantType !== 'authorization_code' || code !== validCode) {
              return new Response(undefined, { status: 401 });
            }

            return Response.json({
              token: accessToken,
              refreshToken: validRefreshToken,
              expiresAt,
            });
          }
        )
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken(validCode, installationId)).resolves.toStrictEqual({
        accessToken,
        refreshToken: validRefreshToken,
        expiresAt,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code', installationId)).rejects.toBeInstanceOf(SentryError);
    });
  });

  describe('getRefreshToken', () => {
    beforeEach(() => {
      server.use(
        http.post(
          `${env.SENTRY_API_BASE_URL}/sentry-app-installations/${installationId}/authorizations/`,
          async ({ request }) => {
            const body = (await request.json()) as GetRefreshTokenRequestData;
            const searchParams = new URLSearchParams(body);

            const grantType = searchParams.get('grant_type');
            const token = searchParams.get('refresh_token');

            if (grantType !== 'refresh_token' || token !== validRefreshToken) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json({
              token: accessToken,
              refreshToken: validRefreshToken,
              expiresAt,
            });
          }
        )
      );
    });

    test('should return the refreshToken when the refreshToken is valid', async () => {
      await expect(getRefreshToken(validRefreshToken, installationId)).resolves.toStrictEqual({
        accessToken,
        refreshToken: validRefreshToken,
        expiresAt,
      });
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(getToken('wrong-refreshtoken', installationId)).rejects.toBeInstanceOf(
        SentryError
      );
    });
  });
});
