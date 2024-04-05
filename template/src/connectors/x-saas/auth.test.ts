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
import { env } from '@/common/env';
import { server } from '../../../vitest/setup-msw-handlers';
import { getRefreshedToken, getToken } from './auth';
import { XSaasError } from './commons/error';

const validCode = '1234';
const validRefreshToken = 'refresh-token';
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const expiresIn = 60;

describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post('https://mysaas.com/api/v1/token', async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = (await request.json()) as {
            code: string;
            client_id: string;
            client_secret: string;
            redirect_uri: string;
            grant_type: string;
          };
          if (
            !data.code ||
            data.code !== validCode ||
            data.client_id !== env.X_SAAS_CLIENT_ID ||
            data.client_secret !== env.X_SAAS_CLIENT_SECRET ||
            data.redirect_uri !== env.X_SAAS_REDIRECT_URI ||
            data.grant_type !== 'authorization_code'
          ) {
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

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(XSaasError);
    });
  });

  describe('getRefreshedToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post('https://mysaas.com/api/v1/token', async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = (await request.json()) as {
            refresh_token: string;
            client_id: string;
            client_secret: string;
            redirect_uri: string;
            grant_type: string;
          };
          if (
            data.refresh_token !== validRefreshToken ||
            data.client_id !== env.X_SAAS_CLIENT_ID ||
            data.client_secret !== env.X_SAAS_CLIENT_SECRET ||
            data.grant_type !== 'refresh_token'
          ) {
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

    test('should return the token when the refresh token is valid', async () => {
      await expect(getRefreshedToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    });

    test('should throw when the refresh token is invalid', async () => {
      await expect(getRefreshedToken('wrong-refresh-token')).rejects.toBeInstanceOf(XSaasError);
    });
  });
});
