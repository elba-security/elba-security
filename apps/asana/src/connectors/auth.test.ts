/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { z } from 'zod';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import type { GetTokenResponseData } from './auth';
import { getToken } from './auth';
import { AsanaError } from './commons/error';

const validCode = '1234';

describe('auth connector', () => {
  describe('getToken', () => {
    const validDataSchema = z.object({
      grant_type: z.literal('authorization_code'),
      client_id: z.literal(env.ASANA_CLIENT_ID),
      client_secret: z.literal(env.ASANA_CLIENT_SECRET),
      redirect_uri: z.literal(env.ASANA_REDIRECT_URI),
      code: z.literal(validCode),
    });

    const token: GetTokenResponseData = {
      access_token: 'some_access_token',
      refresh_token: 'some_refresh_token',
      token_type: 'some_token_type',
      expires_in: 12000,
      data: {
        id: 'some_data_id',
        gid: 'some_data_gid',
        name: 'some_data_name',
        email: 'some_data_email',
      },
    };
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.ASANA_API_BASE_URL}/oauth_token`, async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = (await request.json()) as { code: string };
          const result = validDataSchema.safeParse(data);
          if (!result.success) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json(token);
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toStrictEqual(token);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(AsanaError);
    });
  });
});
