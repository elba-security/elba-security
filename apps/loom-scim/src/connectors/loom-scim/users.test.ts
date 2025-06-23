import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { getUsers, deleteUser } from './users';

const SCIM_BRIDGE_URL = 'https://scim.loom.example.com';
const API_KEY = 'test-api-key';

describe('loom-scim/connectors/users', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${SCIM_BRIDGE_URL}/scim/v2/Users`, ({ request }) => {
          const url = new URL(request.url);
          const startIndex = parseInt(url.searchParams.get('startIndex') || '1');

          const authHeader = request.headers.get('authorization');
          if (authHeader !== `Bearer ${API_KEY}`) {
            return new Response(
              JSON.stringify({
                schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                detail: 'Authentication failed',
                status: '401',
              }),
              { status: 401 }
            );
          }

          // Simulate pagination
          if (startIndex === 1) {
            return Response.json({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
              totalResults: 3,
              startIndex: 1,
              itemsPerPage: 2,
              Resources: [
                {
                  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                  id: 'user-1',
                  userName: 'john.doe@example.com',
                  name: {
                    givenName: 'John',
                    familyName: 'Doe',
                    formatted: 'John Doe',
                  },
                  displayName: 'John Doe',
                  emails: [
                    {
                      value: 'john.doe@example.com',
                      primary: true,
                      type: 'work',
                    },
                  ],
                  active: true,
                  meta: {
                    resourceType: 'User',
                    created: '2024-01-01T00:00:00Z',
                    lastModified: '2024-01-01T00:00:00Z',
                  },
                  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
                    loomMemberRole: 'admin',
                  },
                },
                {
                  schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                  id: 'user-2',
                  userName: 'jane.smith@example.com',
                  name: {
                    givenName: 'Jane',
                    familyName: 'Smith',
                    formatted: 'Jane Smith',
                  },
                  emails: [
                    {
                      value: 'jane.smith@example.com',
                      primary: true,
                    },
                  ],
                  active: true,
                  meta: {
                    resourceType: 'User',
                    created: '2024-01-02T00:00:00Z',
                    lastModified: '2024-01-02T00:00:00Z',
                  },
                  'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
                    loomMemberRole: 'creator',
                  },
                },
              ],
            });
          }

          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 3,
            startIndex: 3,
            itemsPerPage: 1,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-3',
                userName: 'inactive.user@example.com',
                active: false,
                meta: {
                  resourceType: 'User',
                  created: '2024-01-03T00:00:00Z',
                  lastModified: '2024-01-03T00:00:00Z',
                },
              },
            ],
          });
        })
      );
    });

    test('should fetch and transform users correctly', async () => {
      const result = await getUsers({
        apiKey: API_KEY,
        scimBridgeUrl: SCIM_BRIDGE_URL,
        startIndex: 1,
        count: 100,
      });

      expect(result).toStrictEqual({
        users: [
          {
            id: 'user-1',
            displayName: 'John Doe',
            email: 'john.doe@example.com',
            role: 'admin',
          },
          {
            id: 'user-2',
            displayName: 'Jane Smith',
            email: 'jane.smith@example.com',
            role: 'creator',
          },
        ],
        nextStartIndex: 101,
        totalResults: 3,
      });
    });

    test('should handle users without displayName', async () => {
      server.use(
        http.get(`${SCIM_BRIDGE_URL}/scim/v2/Users`, () => {
          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 1,
            startIndex: 1,
            itemsPerPage: 1,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-no-display',
                userName: 'user@example.com',
                emails: [{ value: 'user@example.com', primary: true }],
                active: true,
                meta: {
                  resourceType: 'User',
                  created: '2024-01-01T00:00:00Z',
                  lastModified: '2024-01-01T00:00:00Z',
                },
              },
            ],
          });
        })
      );

      const result = await getUsers({
        apiKey: API_KEY,
        scimBridgeUrl: SCIM_BRIDGE_URL,
      });

      expect(result.users[0]).toMatchObject({
        id: 'user-no-display',
        displayName: 'user@example.com',
        email: 'user@example.com',
        role: undefined,
      });
    });

    test('should filter out inactive users', async () => {
      const result = await getUsers({
        apiKey: API_KEY,
        scimBridgeUrl: SCIM_BRIDGE_URL,
        startIndex: 3,
        count: 100,
      });

      expect(result.users).toHaveLength(0);
      expect(result.nextStartIndex).toBeUndefined();
    });

    test('should handle authentication errors', async () => {
      await expect(
        getUsers({
          apiKey: 'invalid-key',
          scimBridgeUrl: SCIM_BRIDGE_URL,
        })
      ).rejects.toThrow('Unauthorized');
    });

    test('should handle users with default role', async () => {
      server.use(
        http.get(`${SCIM_BRIDGE_URL}/scim/v2/Users`, () => {
          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 1,
            startIndex: 1,
            itemsPerPage: 1,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-default-role',
                userName: 'default@example.com',
                displayName: 'Default User',
                emails: [{ value: 'default@example.com', primary: true }],
                active: true,
                meta: {
                  resourceType: 'User',
                  created: '2024-01-01T00:00:00Z',
                  lastModified: '2024-01-01T00:00:00Z',
                },
                'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User': {
                  loomMemberRole: 'default',
                },
              },
            ],
          });
        })
      );

      const result = await getUsers({
        apiKey: API_KEY,
        scimBridgeUrl: SCIM_BRIDGE_URL,
      });

      expect(result.users[0]?.role).toBeUndefined();
    });
  });

  describe('deleteUser', () => {
    test('should deactivate user successfully', async () => {
      server.use(
        http.patch(`${SCIM_BRIDGE_URL}/scim/v2/Users/:userId`, ({ params }) => {
          expect(params.userId).toBe('user-1');
          return new Response(null, { status: 200 });
        })
      );

      await expect(
        deleteUser({
          apiKey: API_KEY,
          scimBridgeUrl: SCIM_BRIDGE_URL,
          userId: 'user-1',
        })
      ).resolves.not.toThrow();
    });

    test('should handle 404 gracefully', async () => {
      server.use(
        http.patch(`${SCIM_BRIDGE_URL}/scim/v2/Users/:userId`, () => {
          return new Response(
            JSON.stringify({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: 'User not found',
              status: '404',
            }),
            { status: 404 }
          );
        })
      );

      await expect(
        deleteUser({
          apiKey: API_KEY,
          scimBridgeUrl: SCIM_BRIDGE_URL,
          userId: 'non-existent',
        })
      ).resolves.not.toThrow();
    });

    test('should handle authentication errors', async () => {
      server.use(
        http.patch(`${SCIM_BRIDGE_URL}/scim/v2/Users/:userId`, () => {
          return new Response(
            JSON.stringify({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: 'Authentication failed',
              status: '401',
            }),
            { status: 401 }
          );
        })
      );

      await expect(
        deleteUser({
          apiKey: API_KEY,
          scimBridgeUrl: SCIM_BRIDGE_URL,
          userId: 'user-1',
        })
      ).rejects.toThrow('Unauthorized');
    });

    test('should handle other errors', async () => {
      server.use(
        http.patch(`${SCIM_BRIDGE_URL}/scim/v2/Users/:userId`, () => {
          return new Response(
            JSON.stringify({
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: 'Internal server error',
              status: '500',
            }),
            { status: 500 }
          );
        })
      );

      await expect(
        deleteUser({
          apiKey: API_KEY,
          scimBridgeUrl: SCIM_BRIDGE_URL,
          userId: 'user-1',
        })
      ).rejects.toThrow('Failed to deactivate user: Internal server error');
    });
  });
});
