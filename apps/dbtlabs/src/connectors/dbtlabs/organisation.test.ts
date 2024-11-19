import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { DbtlabsError } from '../common/error';
import { getOrganisation } from './organisation';

const validToken = 'token-1234';
const accessUrl = 'https://example.us1.dbt.com';
const accountId = 'test-account-id';
const name = 'Sales Team';
const plan = 'teams';

describe('organisation connector', () => {
  describe('getOrganisation', () => {
    beforeEach(() => {
      server.use(
        http.get(`${accessUrl}/api/v2/accounts/${accountId}`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ data: { name, plan } });
        })
      );
    });

    test('should return correct organisation details', async () => {
      await expect(
        getOrganisation({ serviceToken: validToken, accessUrl, accountId })
      ).resolves.toStrictEqual({
        name,
        plan,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getOrganisation({ serviceToken: 'foo-bar', accessUrl, accountId })
      ).rejects.toBeInstanceOf(DbtlabsError);
    });
  });
});
