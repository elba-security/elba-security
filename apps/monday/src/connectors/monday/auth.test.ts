/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { MondayError } from '../common/error';
import type { GetTokenResponseData } from './auth';
import { getToken } from './auth';

const validCode = '1234';
const token = 'token-1234';

const tokenResponse: GetTokenResponseData = {
  access_token: token,
};

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post('https://auth.monday.com/oauth2/token', async ({ request }) => {
          const data = (await request.json()) as { code: string };

          if (!data.code || data.code !== validCode) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({
            access_token: token,
            token_type: 'Bearer',
            scope: 'boards:write boards:read',
          });
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual(tokenResponse);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(MondayError);
    });
  });
});
