import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '../../common/env';
import { ClickUpError } from '../common/error';
import { getAccessToken } from './auth';

const validAuthCode = 'valid-code';
const accessToken = 'access-token';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.CLICKUP_API_BASE_URL}/oauth/token`, async ({ request }) => {
        const body = await request.text();
        const searchParams = new URLSearchParams(body);
        const code = searchParams.get('code');
        if (code !== validAuthCode) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ access_token: accessToken }), { status: 200 });
      })
    );
  });

  test('should not throw when authorization code is valid', async () => {
    await expect(getAccessToken(validAuthCode)).resolves.toStrictEqual(accessToken);
  });

  test('should throw an error when authorization code is invalid', async () => {
    await expect(getAccessToken('invalid-auth-code')).rejects.toThrowError(ClickUpError);
  });
});
