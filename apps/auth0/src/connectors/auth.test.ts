import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { getToken } from './auth';
import { Auth0Error } from './commons/error';

const validClientId = 'test-client-id';
const validClientSecret = 'test-client-secret';
const domain = 'test-domain';
const audience = 'test-audience';
const accessToken = 'access-token';
const scope = 'scope';
const expiresIn = 'expires_in';
const tokenType = 'bearer';

describe('getToken', () => {
  beforeEach(() => {
    server.use(
      http.post(`https://${domain}/oauth/token`, async ({ request }) => {
        if (request.body !== null) {
          const requestBody = JSON.parse(await request.text()) as {
            client_id: string;
            client_secret: string;
            audience: string;
          };
          if (
            requestBody.client_id !== validClientId ||
            requestBody.client_secret !== validClientSecret ||
            requestBody.audience !== audience
          ) {
            return new Response(undefined, { status: 401 });
          }
        }
        return new Response(
          JSON.stringify({
            access_token: accessToken,
            scope,
            expires_in: expiresIn,
            token_type: tokenType,
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should not throw when client id, client secret, domain and audience are valid', async () => {
    try {
      await expect(
        getToken(validClientId, validClientSecret, audience, domain)
      ).resolves.toStrictEqual({
        access_token: accessToken,
        scope,
        expires_in: expiresIn,
        token_type: tokenType,
      });
    } catch (error) {
      expect(error).toBeNull();
    }
  });

  test('should throw an error when client id, client secret, domain or audience is invalid', async () => {
    try {
      await expect(
        getToken('invalid-client-id', validClientSecret, audience, domain)
      ).rejects.toBeInstanceOf(Auth0Error);
    } catch (error) {
      expect((error as Auth0Error).message).toBe('Failed to fetch');
    }
  });
});
