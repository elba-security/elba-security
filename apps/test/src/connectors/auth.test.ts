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
import { getToken } from './auth';
import { MySaasError } from './commons/error';

const validCode = '1234';
const token = 'token-1234';

describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post('https://mysaas.com/api/v1/token', async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = (await request.json()) as { code: string };
          if (!data.code || data.code !== validCode) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({ token });
        })
      );
    });

    test('should return the token when the code is valid', async () => {
      await expect(getToken(validCode)).resolves.toBe(token);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getToken('wrong-code')).rejects.toBeInstanceOf(MySaasError);
    });
  });
});
