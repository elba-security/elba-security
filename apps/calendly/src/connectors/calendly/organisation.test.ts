import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { CalendlyError, CalendlyNotAdminError } from '../common/error';
import { getOrganisation } from './organisation';

const validToken = 'token-1234';
const basicOrganizationUri = 'https://api.calendly.com/organizations/basic';
const teamsOrganizationUri = 'https://api.calendly.com/organizations/teams';
const name = 'Sales Team';
const plan = 'teams';
const stage = 'paid';

describe('organisation connector', () => {
  describe('getOrganisation', () => {
    beforeEach(() => {
      server.use(
        http.get(teamsOrganizationUri, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({
            resource: {
              uri: teamsOrganizationUri,
              name,
              plan,
              stage,
              created_at: '2019-01-02T03:04:05.678123Z',
              updated_at: '2019-08-07T06:05:04.321123Z',
            },
          });
        }),

        http.get(basicOrganizationUri, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json({
            resource: {
              uri: basicOrganizationUri,
              name,
              plan: 'basic',
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
        getOrganisation({ accessToken: validToken, organizationUri: teamsOrganizationUri })
      ).resolves.toStrictEqual({
        plan,
        stage,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getOrganisation({ accessToken: 'foo-bar', organizationUri: basicOrganizationUri })
      ).rejects.toBeInstanceOf(CalendlyError);
    });

    test('should throws when the plan is basic', async () => {
      await expect(
        getOrganisation({ accessToken: validToken, organizationUri: basicOrganizationUri })
      ).rejects.toBeInstanceOf(CalendlyNotAdminError);
    });
  });
});
