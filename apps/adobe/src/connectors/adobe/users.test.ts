import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';
import type { AdobeUser } from './users';
import { getOrganization, getUsers } from './users';

const validToken = 'valid-access-token';
const validApiKey = 'valid-api-key';
const organizationId = '12345@AdobeOrg';

const validUsers: AdobeUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `user-${i}@AdobeID`,
  email: `user${i}@example.com`,
  firstname: `John${i}`,
  lastname: `Doe${i}`,
  username: `user${i}`,
  status: 'active',
  type: 'federatedID',
  country: 'US',
  domain: 'example.com',
  groups: ['group1', 'group2'],
}));

const invalidUsers = [
  {
    id: 'invalid-user',
    // Missing required fields
  },
];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.ADOBE_API_BASE_URL}/v2/usermanagement/users/${organizationId}/:page`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            if (request.headers.get('X-Api-Key') !== validApiKey) {
              return new Response(undefined, { status: 401 });
            }

            const page = Number(params.page);
            const isLastPage = page >= 2;

            const responseData = {
              result: 'success',
              lastPage: isLastPage,
              users: page === 0 ? [...validUsers, ...invalidUsers] : validUsers,
            };

            return Response.json(responseData);
          }
        )
      );
    });

    test('should return users and nextPage when not on last page', async () => {
      await expect(
        getUsers({
          accessToken: validToken,
          apiKey: validApiKey,
          organizationId,
          page: 0,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: 1,
      });
    });

    test('should return users and no nextPage when on last page', async () => {
      await expect(
        getUsers({
          accessToken: validToken,
          apiKey: validApiKey,
          organizationId,
          page: 2,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: null,
      });
    });

    test('should filter out non-active users', async () => {
      server.use(
        http.get(
          `${env.ADOBE_API_BASE_URL}/v2/usermanagement/users/${organizationId}/:page`,
          ({ request }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              request.headers.get('X-Api-Key') !== validApiKey
            ) {
              return new Response(undefined, { status: 401 });
            }

            const mixedUsers = [
              ...validUsers.slice(0, 2),
              { ...validUsers[2], status: 'disabled' },
              { ...validUsers[3], status: 'locked' },
              validUsers[4],
            ];

            return Response.json({
              result: 'success',
              lastPage: true,
              users: mixedUsers,
            });
          }
        )
      );

      const result = await getUsers({
        accessToken: validToken,
        apiKey: validApiKey,
        organizationId,
        page: 0,
      });

      expect(result.validUsers).toHaveLength(3);
      expect(result.validUsers.every((user) => user.status === 'active')).toBe(true);
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(
        getUsers({
          accessToken: 'invalid-token',
          apiKey: validApiKey,
          organizationId,
          page: 0,
        })
      ).rejects.toBeInstanceOf(IntegrationConnectionError);
    });

    test('should throw IntegrationError when API returns error result', async () => {
      server.use(
        http.get(
          `${env.ADOBE_API_BASE_URL}/v2/usermanagement/users/${organizationId}/:page`,
          ({ request }) => {
            if (
              request.headers.get('Authorization') === `Bearer ${validToken}` &&
              request.headers.get('X-Api-Key') === validApiKey
            ) {
              return Response.json({
                result: 'error',
                lastPage: false,
                users: [],
              });
            }
            return new Response(undefined, { status: 401 });
          }
        )
      );

      await expect(
        getUsers({
          accessToken: validToken,
          apiKey: validApiKey,
          organizationId,
          page: 0,
        })
      ).rejects.toThrow('API returned error result');
    });
  });

  describe('getOrganization', () => {
    const organizationData = {
      orgId: organizationId,
      orgName: 'Test Organization',
      orgType: 'Enterprise',
      orgRef: {
        orgId: organizationId,
        orgName: 'Test Organization',
        ident: 'test-org',
      },
    };

    beforeEach(() => {
      server.use(
        http.get(`${env.ADOBE_API_BASE_URL}/v2/usermanagement/organizations`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          if (request.headers.get('X-Api-Key') !== validApiKey) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(organizationData);
        })
      );
    });

    test('should successfully retrieve organization data', async () => {
      await expect(getOrganization(validToken, validApiKey)).resolves.toStrictEqual(
        organizationData
      );
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(getOrganization('invalid-token', validApiKey)).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationConnectionError when API key is invalid', async () => {
      await expect(getOrganization(validToken, 'invalid-api-key')).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationConnectionError for invalid organization data', async () => {
      server.use(
        http.get(`${env.ADOBE_API_BASE_URL}/v2/usermanagement/organizations`, ({ request }) => {
          if (
            request.headers.get('Authorization') === `Bearer ${validToken}` &&
            request.headers.get('X-Api-Key') === validApiKey
          ) {
            return Response.json({
              // Invalid data - missing required fields
              orgName: 'Test',
            });
          }
          return new Response(undefined, { status: 401 });
        })
      );

      await expect(getOrganization(validToken, validApiKey)).rejects.toBeInstanceOf(
        IntegrationConnectionError
      );
    });
  });
});
