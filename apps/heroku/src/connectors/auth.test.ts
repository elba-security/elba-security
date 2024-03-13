import { fail } from 'node:assert';
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getAccessToken, refreshAccessToken } from './auth';
import { type HerokuError } from './commons/error';

const validAuthCode = 'valid-code';
const validRefreshToken = 'valid-refresh-token';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post('https://id.heroku.com/oauth/token', ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        if (code !== validAuthCode) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 'expiry-time',
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should not throw when authorization code is valid', async () => {
    try {
      await getAccessToken(validAuthCode);
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when authorization code is invalid', async () => {
    try {
      await getAccessToken('invalid-auth-code');
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as HerokuError).message).toBe('Failed to fetch');
    }
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post('https://id.heroku.com/oauth/token', ({ request }) => {
        const url = new URL(request.url);
        const refreshToken = url.searchParams.get('refresh_token');
        if (refreshToken !== validRefreshToken) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 'expire-time',
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should not throw when refresh token is valid', async () => {
    try {
      await refreshAccessToken(validRefreshToken);
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when refresh token is invalid', async () => {
    try {
      await refreshAccessToken('invalid-refresh-token');
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as HerokuError).message).toBe('Failed to refresh token');
    }
  });
});
