import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { CalendlyError } from '../common/error';
import { getOrganisation } from './organisation';

const validToken = 'token-1234';
const organizationUri = 'https://api.calendly.com/organizations/012345678901234567890';
const name = 'Sales Team';
const plan = 'teams';
const stage = 'paid';

describe('organisation connector', () => {
  describe('getOrganisation', () => {
    beforeEach(() => {
      server.use(
        http.get(organizationUri, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            resource: {
              uri: organizationUri,
              name,
              plan,
              stage,
              created_at: '2019-01-02T03:04:05.678123Z',
              updated_at: '2019-08-07T06:05:04.321123Z',
            },
          });
        })
      );
    });

    test('should return correct organisation details', async () => {
      await expect(
        getOrganisation({ accessToken: validToken, organizationUri })
      ).resolves.toStrictEqual({
        name,
        plan,
        stage,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getOrganisation({ accessToken: 'foo-bar', organizationUri })
      ).rejects.toBeInstanceOf(CalendlyError);
    });
  });
});
