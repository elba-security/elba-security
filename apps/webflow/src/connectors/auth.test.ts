import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getAccessToken } from './auth';
import { type WebflowError } from './commons/error';

const validAuthCode = 'valid-code';
const accessToken = 'access-token';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post('https://api.webflow.com/oauth/access_token', ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        if (code !== validAuthCode) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ access_token: accessToken }), { status: 200 });
      })
    );
  });

  test('should not throw when authorization code is valid', async () => {
    try {
      await expect(getAccessToken(validAuthCode)).resolves.toStrictEqual(accessToken);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when authorization code is invalid', async () => {
    try {
      await getAccessToken('invalid-auth-code');
    } catch (error) {
      expect((error as WebflowError).message).toBe('Failed to fetch');
    }
  });
});
