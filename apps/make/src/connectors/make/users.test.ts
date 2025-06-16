import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import type { MakeUser } from './users';
import { getUsers, removeUserFromOrganization, getAuthUser, getOrganizations } from './users';

const validToken = 'token-1234';
const organizationId = '12345';
const userId = '67890';
const baseUrl = 'https://eu1.make.com/api/v2';

const validUsers: MakeUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  email: `user-${i}@example.com`,
  name: `User ${i}`,
  language: 'en',
  timezoneId: 1,
  localeId: 1,
  countryId: 1,
  features: {},
  avatar: `https://example.com/avatar-${i}.png`,
  lastLogin: '2024-01-01T00:00:00Z',
}));

const invalidUsers = [
  {
    id: 'invalid',
    email: 'not-an-email',
  },
];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${baseUrl}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const orgId = url.searchParams.get('organizationId');
          if (orgId !== organizationId) {
            return new Response(undefined, { status: 404 });
          }

          const limit = Number(url.searchParams.get('pg[limit]'));
          const offset = Number(url.searchParams.get('pg[offset]'));

          return Response.json({
            users: [...validUsers, ...invalidUsers],
            pg: {
              limit,
              offset,
              totalCount: 100,
            },
          });
        })
      );
    });

    test('should return users and nextPage when there are more pages', async () => {
      await expect(
        getUsers({ accessToken: validToken, organizationId, baseUrl, page: 0 })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: 1,
      });
    });

    test('should return users and no nextPage when on last page', async () => {
      server.use(
        http.get(`${baseUrl}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const limit = Number(url.searchParams.get('pg[limit]'));
          const offset = Number(url.searchParams.get('pg[offset]'));

          return Response.json({
            users: validUsers,
            pg: {
              limit,
              offset,
              totalCount: offset + validUsers.length,
            },
          });
        })
      );

      await expect(
        getUsers({ accessToken: validToken, organizationId, baseUrl, page: 1 })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: null,
      });
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(
        getUsers({ accessToken: 'invalid-token', organizationId, baseUrl })
      ).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(http.get(`${baseUrl}/users`, () => new Response(undefined, { status: 500 })));

      await expect(
        getUsers({ accessToken: validToken, organizationId, baseUrl })
      ).rejects.toStrictEqual(
        new IntegrationError('Could not retrieve users', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          response: expect.any(Response),
        })
      );
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${baseUrl}/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            authUser: {
              id: 123,
              email: 'admin@example.com',
              name: 'Admin User',
            },
          });
        })
      );
    });

    test('should return the authenticated user ID', async () => {
      await expect(getAuthUser(validToken, baseUrl)).resolves.toStrictEqual({
        authUserId: '123',
      });
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(getAuthUser('invalid-token', baseUrl)).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(http.get(`${baseUrl}/users/me`, () => new Response(undefined, { status: 500 })));

      await expect(getAuthUser(validToken, baseUrl)).rejects.toStrictEqual(
        new IntegrationError('Could not retrieve authenticated user', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          response: expect.any(Response),
        })
      );
    });

    test('should throw IntegrationConnectionError for invalid response', async () => {
      server.use(
        http.get(`${baseUrl}/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            invalid: 'response',
          });
        })
      );

      await expect(getAuthUser(validToken, baseUrl)).rejects.toStrictEqual(
        new IntegrationConnectionError('Invalid Make authenticated user response', {
          type: 'unknown',
          metadata: expect.any(Object),
        })
      );
    });
  });

  describe('removeUserFromOrganization', () => {
    beforeEach(() => {
      server.use(
        http.delete(
          `${baseUrl}/organizations/:organizationId/users/:userId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Token ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.organizationId !== organizationId || params.userId !== userId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 204 });
          }
        )
      );
    });

    test('should remove user successfully', async () => {
      await expect(
        removeUserFromOrganization({ accessToken: validToken, userId, organizationId, baseUrl })
      ).resolves.not.toThrow();
    });

    test('should not throw when user not found', async () => {
      await expect(
        removeUserFromOrganization({
          accessToken: validToken,
          userId: 'non-existent',
          organizationId,
          baseUrl,
        })
      ).resolves.not.toThrow();
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(
        http.delete(
          `${baseUrl}/organizations/:organizationId/users/:userId`,
          () => new Response(undefined, { status: 500 })
        )
      );

      await expect(
        removeUserFromOrganization({ accessToken: validToken, userId, organizationId, baseUrl })
      ).rejects.toStrictEqual(
        new IntegrationError(
          `Could not remove user ${userId} from organization ${organizationId}`,
          {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
            response: expect.any(Response),
          }
        )
      );
    });
  });

  describe('getOrganizations', () => {
    beforeEach(() => {
      server.use(
        http.get(`${baseUrl}/organizations`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            organizations: [
              { id: 1, name: 'Organization 1', zone: 'eu1.make.com' },
              { id: 2, name: 'Organization 2', zone: 'us1.make.com' },
            ],
          });
        })
      );
    });

    test('should return organizations', async () => {
      await expect(getOrganizations(validToken, baseUrl)).resolves.toStrictEqual([
        { id: 1, name: 'Organization 1', zone: 'eu1.make.com' },
        { id: 2, name: 'Organization 2', zone: 'us1.make.com' },
      ]);
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(getOrganizations('invalid-token', baseUrl)).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError for invalid response', async () => {
      server.use(
        http.get(`${baseUrl}/organizations`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({ invalid: 'response' });
        })
      );

      await expect(getOrganizations(validToken, baseUrl)).rejects.toStrictEqual(
        new IntegrationError('Invalid Make organizations response', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          response: expect.any(Response),
        })
      );
    });
  });
});
