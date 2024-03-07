/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getToken } from './auth';
import { IntercomError } from './commons/error';

const validCode = '1234';
const accessToken = 'access-token-1234';
describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.INTERCOM_API_BASE_URL}/auth/eagle/token`, async ({ request }) => {
          // briefly implement API endpoint behaviour
          const body = await request.text();
          const searchParams = new URLSearchParams(body);

          const clientId = searchParams.get('client_id');
          const clientSecret = searchParams.get('client_secret');
          const code = searchParams.get('code');

          if (
            clientId !== env.INTERCOM_CLIENT_ID ||
            clientSecret !== env.INTERCOM_CLIENT_SECRET ||
            code !== validCode
          ) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ access_token: accessToken });
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual({ accessToken });
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(IntercomError);
    });
  });
});
