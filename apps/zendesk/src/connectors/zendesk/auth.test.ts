import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ZendeskError } from '../common/error';
import { getToken } from './auth';

const validCode = '1234';
const subDomain = 'https://some-subdomain';
const accessToken = 'access-token-1234';

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${subDomain}/oauth/tokens`, async ({ request }) => {
          const body = await request.text();
          const searchParams = new URLSearchParams(body);
          const grantType = searchParams.get('grant_type');
          const code = searchParams.get('code');

          if (grantType !== 'authorization_code' || code !== validCode) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            access_token: accessToken,
          });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken({ code: validCode, subDomain })).resolves.toStrictEqual({
        accessToken,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken({ code: 'wrong-code', subDomain })).rejects.toBeInstanceOf(
        ZendeskError
      );
    });
  });
});
