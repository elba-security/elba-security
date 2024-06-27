import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { getAccessToken } from './auth';

const validAuthCode = 'valid-code';
const accessToken = 'access-token';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`${env.WEBFLOW_API_BASE_URL}/oauth/access_token`, ({ request }) => {
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
    await expect(getAccessToken('invalid-auth-code')).rejects.toThrowError(Error);
  });
});
