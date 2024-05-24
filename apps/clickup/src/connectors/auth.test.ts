import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { env } from '../env';
import { getAccessToken } from './auth';
import { ClickUpError } from './commons/error';

const validAuthCode = 'valid-code';
const accessToken = 'access-token';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.CLICKUP_API_BASE_URL}/oauth/token`, ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get('code');
        if (code !== validAuthCode) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(JSON.stringify({ access_token: accessToken }), { status: 200 });
      })
    );
  });

  test('should throw an error when authorization code is invalid', async () => {
    await expect(getAccessToken('invalid-auth-code')).rejects.toThrowError(ClickUpError);
  });
});
