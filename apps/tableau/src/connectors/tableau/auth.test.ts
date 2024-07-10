import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { TableauError } from '../commons/error';
import { authenticate } from './auth';

const validJwt = '1234';
const domain = 'test.tableau.com';
const siteId = 'site-1234';

describe('auth connector', () => {
  describe('authenticate', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`https://${domain}/api/3.22/auth/signin`, async ({ request }) => {
          // briefly implement API endpoint behaviour
          const data = (await request.json()) as {
            credentials: {
              jwt: string;
              site: {
                contentUrl: string;
              };
            };
          };
          if (data.credentials.jwt !== validJwt) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({
            ok: true,
            credentials: {
              site: {
                id: 'tableau-site-id',
                contentUrl: siteId,
              },
              user: {
                id: 'tableau-user-id',
              },
              token: 'valid-token',
            },
          });
        })
      );
    });

    test('should return the credentials when the code is valid', async () => {
      await expect(
        authenticate({ token: validJwt, domain, contentUrl: 'content-url' })
      ).resolves.toStrictEqual({
        credentials: {
          site: {
            id: 'tableau-site-id',
            contentUrl: siteId,
          },
          user: {
            id: 'tableau-user-id',
          },
          token: 'valid-token',
        },
      });
    });

    test('should throw when the code is invalid', async () => {
      await expect(
        authenticate({ token: 'wrong-code', domain, contentUrl: 'content-url' })
      ).rejects.toBeInstanceOf(TableauError);
    });
  });
});
