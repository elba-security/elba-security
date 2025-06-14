import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http } from 'msw';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';
import { getUsers, deleteUser } from './users';

describe('figma-scim/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    server.resetHandlers();
  });

  describe('getUsers', () => {
    it('should fetch users successfully with pagination', async () => {
      server.use(
        http.get(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users`, () => {
          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 3,
            startIndex: 1,
            itemsPerPage: 2,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-1',
                userName: 'user1@example.com',
                displayName: 'User One',
                name: {
                  givenName: 'User',
                  familyName: 'One',
                  formatted: 'User One',
                },
                emails: [
                  {
                    value: 'user1@example.com',
                    primary: true,
                    type: 'work',
                  },
                ],
                active: true,
                meta: {
                  resourceType: 'User',
                  created: '2023-01-01T00:00:00Z',
                  lastModified: '2023-01-01T00:00:00Z',
                },
              },
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-2',
                userName: 'user2@example.com',
                displayName: 'User Two',
                emails: [
                  {
                    value: 'user2@example.com',
                    primary: true,
                  },
                ],
                active: true,
                meta: {
                  resourceType: 'User',
                  created: '2023-01-01T00:00:00Z',
                  lastModified: '2023-01-01T00:00:00Z',
                },
              },
            ],
          });
        })
      );

      const result = await getUsers({
        apiKey: 'test-api-key',
        tenantId: 'test-tenant',
        startIndex: 1,
        count: 2,
      });

      expect(result).toEqual({
        users: [
          {
            id: 'user-1',
            displayName: 'User One',
            email: 'user1@example.com',
          },
          {
            id: 'user-2',
            displayName: 'User Two',
            email: 'user2@example.com',
          },
        ],
        nextStartIndex: 3,
        totalResults: 3,
      });
    });

    it('should handle last page without next cursor', async () => {
      server.use(
        http.get(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users`, () => {
          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 1,
            startIndex: 1,
            itemsPerPage: 100,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-1',
                userName: 'user@example.com',
                active: true,
              },
            ],
          });
        })
      );

      const result = await getUsers({
        apiKey: 'test-api-key',
        tenantId: 'test-tenant',
      });

      expect(result.nextStartIndex).toBeUndefined();
      expect(result.users).toHaveLength(1);
    });

    it('should filter out inactive users', async () => {
      server.use(
        http.get(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users`, () => {
          return Response.json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
            totalResults: 2,
            Resources: [
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-1',
                userName: 'active@example.com',
                active: true,
              },
              {
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                id: 'user-2',
                userName: 'inactive@example.com',
                active: false,
              },
            ],
          });
        })
      );

      const result = await getUsers({
        apiKey: 'test-api-key',
        tenantId: 'test-tenant',
      });

      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.email).toBe('active@example.com');
    });

    it('should throw IntegrationConnectionError on 401', async () => {
      server.use(
        http.get(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users`, () => {
          return new Response(null, { status: 401 });
        })
      );

      await expect(
        getUsers({
          apiKey: 'invalid-key',
          tenantId: 'test-tenant',
        })
      ).rejects.toThrow(IntegrationConnectionError);
    });

    it('should throw IntegrationError on other errors', async () => {
      server.use(
        http.get(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users`, () => {
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
          apiKey: 'test-key',
          tenantId: 'test-tenant',
        })
      ).rejects.toThrow(IntegrationError);
    });
  });

  describe('deleteUser', () => {
    it('should deactivate user successfully', async () => {
      server.use(
        http.patch(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users/user-1`, () => {
          return new Response(null, { status: 200 });
        })
      );

      await expect(
        deleteUser({
          apiKey: 'test-api-key',
          tenantId: 'test-tenant',
          userId: 'user-1',
        })
      ).resolves.not.toThrow();
    });

    it('should not throw on 404 (user already deleted)', async () => {
      server.use(
        http.patch(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users/user-1`, () => {
          return new Response(null, { status: 404 });
        })
      );

      await expect(
        deleteUser({
          apiKey: 'test-api-key',
          tenantId: 'test-tenant',
          userId: 'user-1',
        })
      ).resolves.not.toThrow();
    });

    it('should throw IntegrationConnectionError on 401', async () => {
      server.use(
        http.patch(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users/user-1`, () => {
          return new Response(null, { status: 401 });
        })
      );

      await expect(
        deleteUser({
          apiKey: 'invalid-key',
          tenantId: 'test-tenant',
          userId: 'user-1',
        })
      ).rejects.toThrow(IntegrationConnectionError);
    });

    it('should throw IntegrationError on other errors', async () => {
      server.use(
        http.patch(`${env.FIGMA_SCIM_API_BASE_URL}/scim/v2/test-tenant/Users/user-1`, () => {
          return Response.json(
            {
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: 'Bad request',
              status: '400',
            },
            { status: 400 }
          );
        })
      );

      await expect(
        deleteUser({
          apiKey: 'test-key',
          tenantId: 'test-tenant',
          userId: 'user-1',
        })
      ).rejects.toThrow(IntegrationError);
    });
  });
});
