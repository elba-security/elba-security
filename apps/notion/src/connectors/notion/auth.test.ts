/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenient */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenient */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { NotionError } from '../common/error';
import { getToken } from './auth';

const validCode = '1234';
const accessToken = 'access-token-1234';

describe('auth connector', () => {
  describe('getToken', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.NOTION_API_BASE_URL}/v1/oauth/token`, async ({ request }) => {
          const data = (await request.json()) as { code: string; grant_type: string };

          const grantType = data.grant_type;
          const code = data.code;

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
      await expect(getToken(validCode)).resolves.toStrictEqual({
        accessToken,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(NotionError);
    });
  });
});
