/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../../vitest/setup-msw-handlers';
import { getAccessToken, getCloudId, refreshAccessToken } from './auth';
import { JiraError } from './commons/error';

describe('auth connector', () => {
  describe('getAccessToken', () => {
    const accessToken = 'token-1234';
    const refreshToken = 'refresh-token-1234';
    const expiresIn = 60;
    const accessCode = 'access-code-1234';

    beforeEach(() => {
      server.use(
        http.post(env.JIRA_TOKEN_URL, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          if (searchParams.get('code') !== accessCode) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            access_token: accessToken,
            expires_in: expiresIn,
            refresh_token: refreshToken,
          });
        })
      );
    });

    test('should return the token when the accessCode is valid', async () => {
      await expect(getAccessToken(accessCode)).resolves.toStrictEqual({
        accessToken,
        expiresIn,
        refreshToken,
      });
    });

    test('should throw when the accessCode is invalid', async () => {
      await expect(getAccessToken('wrong-code')).rejects.toBeInstanceOf(JiraError);
    });
  });

  describe('refreshAccessToken', () => {
    const accessToken = 'token-1234';
    const refreshToken = 'refresh-token-1234';
    const expiresIn = 60;

    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(env.JIRA_TOKEN_URL, async ({ request }) => {
          // briefly implement API endpoint behaviour
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          if (searchParams.get('refresh_token') !== refreshToken) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            access_token: accessToken,
            expires_in: expiresIn,
            refresh_token: refreshToken,
          });
        })
      );
    });

    test('should return the token when the refreshToken is valid', async () => {
      await expect(refreshAccessToken(refreshToken)).resolves.toStrictEqual({
        accessToken,
        expiresIn,
        refreshToken,
      });
    });

    test('should throw when the refreshToken is invalid', async () => {
      await expect(refreshAccessToken('wrong-token')).rejects.toBeInstanceOf(JiraError);
    });
  });

  describe('getCloudId', () => {
    const accessToken = 'token-1234';
    const cloudId = 'cloud-id-1234';

    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(env.JIRA_CLOUD_ID_URL, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json([{ id: cloudId }]);
        })
      );
    });

    test('should return the cloudId when using correct accessToken', async () => {
      await expect(getCloudId(accessToken)).resolves.toStrictEqual({ cloudId });
    });

    test('should throw when not using wrong accessToken', async () => {
      await expect(getCloudId('wrong-token')).rejects.toBeInstanceOf(JiraError);
    });
  });
});
