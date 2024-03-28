import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
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
      http.post('https://id.getharvest.com/api/v2/oauth2/token', ({ request }) => {
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

  test('should not throw when authorization code is valid', async () => {
    try {
      await expect(getAccessToken(validAuthCode)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when authorization code is invalid', async () => {
    try {
      await expect(getAccessToken('invalid-auth-code')).rejects.toBeInstanceOf(HarvestError);
    } catch (error) {
      expect((error as HarvestError).message).toBe('Failed to fetch');
    }
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post('https://id.getharvest.com/api/v2/oauth2/token', ({ request }) => {
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

  test('should not throw when refresh token is valid', async () => {
    try {
      await expect(refreshAccessToken(validRefreshToken)).resolves.toStrictEqual({
        accessToken,
        refreshToken,
        expiresIn,
      });
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when refresh token is invalid', async () => {
    try {
      await expect(refreshAccessToken('invalid-refresh-token')).rejects.toBeInstanceOf(
        HarvestError
      );
    } catch (error) {
      expect((error as HarvestError).message).toBe('Failed to refresh token');
    }
  });
});
