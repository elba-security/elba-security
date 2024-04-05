/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getVarification } from './auth';
import { CloudflareError } from './commons/error';

const validAuthEmail = 'test-auth-email@gmail.com';
const validAuthKey = 'test-auth-key';

describe('auth connector', () => {
  describe('getVarification', () => {
    beforeEach(() => {
      server.use(
        http.get('https://api.cloudflare.com/client/v4/user', ({ request }) => {
          // briefly implement API endpoint behaviour
          if (
            request.headers.get('X-Auth-Email') !== validAuthEmail ||
            request.headers.get('X-Auth-Key') !== validAuthKey
          ) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ success: true });
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getVarification(validAuthEmail, validAuthKey)).resolves.toStrictEqual({
        success: true,
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(
        getVarification('wrong-auth-email@gmail.com', 'wrong-auth-key')
      ).rejects.toBeInstanceOf(CloudflareError);
    });
  });
});
