import { fail } from 'node:assert';
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { getAccessToken } from './auth';
import { type CalendlyError } from './commons/error';

const credentials = `${env.CALENDLY_CLIENT_ID}:${env.CALENDLY_CLIENT_SECRET}`;
const encodedCredentials = btoa(credentials);
const validAuthCode = 'valid-code';

describe('getAccessToken', () => {
  beforeEach(() => {
    server.use(
      http.post('https://auth.calendly.com/oauth/token', async ({ request }) => {
        if (request.body !== null) {
          const requestBody = JSON.parse(await request.text()) as { code: string };
          if (requestBody.code !== validAuthCode) {
            return new Response(undefined, { status: 400 });
          }
        }
        if (request.headers.get('Authorization') !== `Basic ${encodedCredentials}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(
          JSON.stringify({
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 'expire-time',
            organization: 'organization-uri',
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should not throw when authorization code is valid', async () => {
    try {
      await getAccessToken(validAuthCode);
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when authorization code is invalid', async () => {
    try {
      await getAccessToken('invalid-auth-code');
      fail('Expected an error to be thrown');
    } catch (error) {
      expect((error as CalendlyError).message).toBe('Failed to fetch');
    }
  });
});
