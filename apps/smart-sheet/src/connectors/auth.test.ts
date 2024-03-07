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
import { z } from 'zod';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getToken, getRefreshedToken, type GetTokenResponseData } from './auth';
import { SmartSheetError } from './commons/error';

const validCode = '1234';

describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw

    const validDataSchema = z.object({
      grant_type: z.literal('authorization_code'),
      client_id: z.literal(env.SMART_SHEET_CLIENT_KEY),
      client_secret: z.literal(env.SMART_SHEET_CLIENT_SECRET),
      redirect_uri: z.literal(env.SMART_SHEET_REDIRECT_URL),
      code: z.literal(validCode),
    });

    const responseToken: GetTokenResponseData = {
      access_token: 'some_access_token',
      refresh_token: 'some_refresh_token',
      expires_in: 3600,
    };
    beforeEach(() => {
      server.use(
        http.post(env.SMART_SHEET_TOKEN_URL, async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = Object.fromEntries(new URLSearchParams(await request.text()));
          const result = validDataSchema.safeParse(data);

          if (!result.success) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(responseToken);
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual(responseToken);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(SmartSheetError);
    });
  });

  describe('getRefreshedToken', () => {
    const validRefreshToken = 'some_refresh_token';

    const validationSchema = z.object({
      grant_type: z.literal('refresh_token'),
      refresh_token: z.literal(validRefreshToken),
    });

    const refreshTokenData = {
      refresh_token: 'some_refresh_token',
      access_token: 'some_access_token',
      expires_in: 3600,
    };

    const validResponseToken = {
      accessToken: 'some_access_token',
      refreshToken: 'some_refresh_token',
      expiresIn: 3600,
    };
    beforeEach(() => {
      server.use(
        http.post(env.SMART_SHEET_TOKEN_URL, async ({ request }) => {
          const data = Object.fromEntries(new URLSearchParams(await request.text()));
          const result = validationSchema.safeParse(data);

          if (!result.success) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(refreshTokenData);
        })
      );
    });

    test('should return a new token when the refreshToken is valid', async () => {
      await expect(getRefreshedToken(validRefreshToken)).resolves.toStrictEqual(
        validResponseToken
      );
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(getRefreshedToken('some invalid refreshToken')).rejects.toBeInstanceOf(
        SmartSheetError
      );
    });
  });
});
