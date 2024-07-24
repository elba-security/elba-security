import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import { getToken } from './auth';
import { MicrosoftError } from './commons/error';

const token = 'token-1234';
const expiresIn = 60;

const tenantId = 'some-tenant-id';

describe('auth connector', () => {
  describe('getToken', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(
          `${env.MICROSOFT_AUTH_API_URL}/:tenantId/oauth2/v2.0/token`,
          async ({ request, params }) => {
            // briefly implement API endpoint behaviour
            const body = await request.text();
            const searchParams = new URLSearchParams(body);

            const clientId = searchParams.get('client_id');
            const clientSecret = searchParams.get('client_secret');
            const grantType = searchParams.get('grant_type');
            const scope = searchParams.get('scope');

            if (
              params.tenantId !== tenantId ||
              clientId !== env.MICROSOFT_CLIENT_ID ||
              clientSecret !== env.MICROSOFT_CLIENT_SECRET ||
              grantType !== 'client_credentials' ||
              scope !== 'https://graph.microsoft.com/.default'
            ) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json({ access_token: token, expires_in: expiresIn });
          }
        )
      );
    });

    test('should return the token when the tenantId is valid', async () => {
      await expect(getToken(tenantId)).resolves.toStrictEqual({ token, expiresIn });
    });

    test('should throw when the tenantId is invalid', async () => {
      await expect(getToken('wrong-tenant-id')).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
