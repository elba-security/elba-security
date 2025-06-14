import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import type { ScimUser } from './users';
import { getUsers, deleteUser } from './users';

// Test data setup
const validApiKey = 'valid-api-key-1234';
const scimBridgeUrl = 'https://scim.example.com';

// Create sample SCIM users for testing
const scimUsers: ScimUser[] = Array.from({ length: 5 }, (_, i) => ({
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
  id: `user-${i}`,
  userName: `user${i}@example.com`,
  name: {
    givenName: `First${i}`,
    familyName: `Last${i}`,
    formatted: `First${i} Last${i}`,
  },
  displayName: `User ${i}`,
  emails: [
    {
      value: `user${i}@example.com`,
      primary: true,
      type: 'work',
    },
  ],
  active: true,
  meta: {
    resourceType: 'User',
    created: '2023-01-01T00:00:00Z',
    lastModified: '2023-01-01T00:00:00Z',
    location: `${scimBridgeUrl}/scim/v2/Users/user-${i}`,
  },
}));

// Add an inactive user to test filtering
const inactiveUser: ScimUser = {
  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
  id: 'user-inactive',
  userName: 'inactive@example.com',
  displayName: 'Inactive User',
  emails: [{ value: 'inactive@example.com', primary: true }],
  active: false,
  meta: {
    resourceType: 'User',
    created: '2023-01-01T00:00:00Z',
    lastModified: '2023-01-01T00:00:00Z',
  },
};

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${scimBridgeUrl}/scim/v2/Users`, ({ request }) => {
          // Validate the API key
          if (request.headers.get('Authorization') !== `Bearer ${validApiKey}`) {
            return Response.json(
              {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: 'Authentication failed',
                status: '401',
              },
              { status: 401 }
            );
          }

          // Handle pagination
          const url = new URL(request.url);
          const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
          const count = parseInt(url.searchParams.get('count') || '100');

          // Simulate pagination
          const allUsers = [...scimUsers, inactiveUser];
          const endIndex = Math.min(startIndex + count - 1, allUsers.length);
          const paginatedUsers = allUsers.slice(startIndex - 1, endIndex);

          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: allUsers.length,
            startIndex,
            itemsPerPage: count,
            Resources: paginatedUsers,
          });
        })
      );
    });

    test('should return users and nextStartIndex when there are more pages', async () => {
      const result = await getUsers({
        apiKey: validApiKey,
        scimBridgeUrl,
        startIndex: 1,
        count: 3,
      });

      expect(result).toStrictEqual({
        users: scimUsers.slice(0, 3).map((user) => ({
          id: user.id,
          displayName: user.displayName,
          email: user.emails?.[0]?.value || user.userName,
        })),
        nextStartIndex: 4,
        totalResults: 6,
      });
    });

    test('should return users without nextStartIndex on last page', async () => {
      const result = await getUsers({
        apiKey: validApiKey,
        scimBridgeUrl,
        startIndex: 4,
        count: 10,
      });

      // Should only return active users
      expect(result).toStrictEqual({
        users: scimUsers.slice(3).map((user) => ({
          id: user.id,
          displayName: user.displayName,
          email: user.emails?.[0]?.value || user.userName,
        })),
        nextStartIndex: undefined,
        totalResults: 6,
      });
    });

    test('should filter out inactive users', async () => {
      const result = await getUsers({
        apiKey: validApiKey,
        scimBridgeUrl,
        startIndex: 1,
        count: 10,
      });

      // Should only return the 5 active users, not the inactive one
      expect(result.users).toHaveLength(5);
      expect(result.users.every((user) => user.id !== 'user-inactive')).toBe(true);
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(
        getUsers({
          apiKey: 'invalid-key',
          scimBridgeUrl,
        })
      ).rejects.toThrow(new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' }));
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(
        http.get(`${scimBridgeUrl}/scim/v2/Users`, () => {
          return Response.json(
            {
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: 'Internal server error',
              status: '500',
            },
            { status: 500 }
          );
        })
      );

      await expect(
        getUsers({
          apiKey: validApiKey,
          scimBridgeUrl,
        })
      ).rejects.toThrow(IntegrationError);
    });

    test('should handle users without display name', async () => {
      server.use(
        http.get(`${scimBridgeUrl}/scim/v2/Users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validApiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 1,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-no-display',
                userName: 'nodisplay@example.com',
                emails: [{ value: 'nodisplay@example.com', primary: true }],
                active: true,
              },
            ],
          });
        })
      );

      const result = await getUsers({
        apiKey: validApiKey,
        scimBridgeUrl,
      });

      // Should use userName as fallback for displayName
      expect(result.users[0]).toStrictEqual({
        id: 'user-no-display',
        displayName: 'nodisplay@example.com',
        email: 'nodisplay@example.com',
      });
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.patch(`${scimBridgeUrl}/scim/v2/Users/:userId`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validApiKey}`) {
            return Response.json(
              {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: 'Authentication failed',
                status: '401',
              },
              { status: 401 }
            );
          }

          const userId = params.userId as string;

          // Simulate user not found
          if (userId === 'non-existent') {
            return Response.json(
              {
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: 'User not found',
                status: '404',
              },
              { status: 404 }
            );
          }

          // Return success response
          return Response.json({
            schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
            id: userId,
            active: false,
          });
        })
      );
    });

    test('should successfully deactivate a user', async () => {
      await expect(
        deleteUser({
          apiKey: validApiKey,
          scimBridgeUrl,
          userId: 'user-1',
        })
      ).resolves.not.toThrow();
    });

    test('should not throw when user does not exist', async () => {
      await expect(
        deleteUser({
          apiKey: validApiKey,
          scimBridgeUrl,
          userId: 'non-existent',
        })
      ).resolves.not.toThrow();
    });

    test('should throw IntegrationConnectionError when unauthorized', async () => {
      await expect(
        deleteUser({
          apiKey: 'invalid-key',
          scimBridgeUrl,
          userId: 'user-1',
        })
      ).rejects.toThrow(new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' }));
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(
        http.patch(`${scimBridgeUrl}/scim/v2/Users/:userId`, () => {
          return Response.json(
            {
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: 'Internal server error',
              status: '500',
            },
            { status: 500 }
          );
        })
      );

      await expect(
        deleteUser({
          apiKey: validApiKey,
          scimBridgeUrl,
          userId: 'user-1',
        })
      ).rejects.toThrow(IntegrationError);
    });
  });
});
