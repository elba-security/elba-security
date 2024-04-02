/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getRefreshToken, getToken } from './auth';
import { BoxError } from './commons/error';

const validCode = '1234';
const validRefreshToken = 'valid-refresh-token';
const accessToken = 'access-token-1234';
const refreshToken = 'refresh-token-1234';
const expiresIn = '1234';

describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.BOX_API_BASE_URL}oauth2/token`, async ({ request }) => {
          // briefly implement API endpoint behaviour
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
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.BOX_API_BASE_URL}oauth2/token`, async ({ request }) => {
          // briefly implement API endpoint behaviour
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

    test('should return the refreshToken when the refreshtoken is valid', async () => {
      await expect(getRefreshToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the refreshtoken is invalid', async () => {
      await expect(getToken('wrong-refreshtoken')).rejects.toBeInstanceOf(BoxError);
    });
  });
});