import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getAccessToken, refreshAccessToken } from './auth';
import { HarvestError } from './commons/error';

const validAuthCode = 'valid-code';
const validRefreshToken = 'valid-refresh-token';
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const expiresIn = 'expiry-time';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.HARVEST_AUTH_BASE_URL}/oauth2/token`, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        if (code !== validAuthCode) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should throw an error when authorization code is invalid', async () => {
    await expect(getAccessToken('invalid-auth-code')).rejects.toThrowError(HarvestError);
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.HARVEST_AUTH_BASE_URL}/oauth2/token`, ({ request }) => {
        const url = new URL(request.url);
        const refreshTokenParam = url.searchParams.get('refresh_token');
        if (refreshTokenParam !== validRefreshToken) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: expiresIn,
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should throw an error when refresh token is invalid', async () => {
    await expect(refreshAccessToken('invalid-refresh-token')).rejects.toThrowError(HarvestError);
  });
});
