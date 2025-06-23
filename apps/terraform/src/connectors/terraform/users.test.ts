import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { TerraformOrganizationMembership, TerraformUser } from './users';
import {
  getOrganizationMemberships,
  getAuthenticatedUserOrganization,
  deleteOrganizationMembership,
} from './users';

// Test data setup
const validToken = 'tfp.abc123';
const organizationName = 'test-org';

// Create sample users
const createUser = (id: string, username: string): TerraformUser => ({
  id,
  type: 'users',
  attributes: {
    username,
    'avatar-url': `https://www.gravatar.com/avatar/${id}`,
    'is-service-account': false,
    'two-factor': {
      enabled: true,
    },
  },
  links: {
    self: `/api/v2/users/${id}`,
  },
});

// Create sample organization memberships
const createMembership = (
  id: string,
  email: string,
  userId: string | null,
  username: string | null = null
): TerraformOrganizationMembership => ({
  id,
  type: 'organization-memberships',
  attributes: {
    email,
    username,
    status: 'active',
  },
  relationships: {
    user: {
      data: userId ? { id: userId, type: 'users' } : null,
    },
    teams: {
      data: [{ id: 'team-123', type: 'teams' }],
    },
  },
  links: {
    self: `/api/v2/organization-memberships/${id}`,
  },
});

describe('users connector', () => {
  describe('getOrganizationMemberships', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.TERRAFORM_API_BASE_URL}/api/v2/organizations/${organizationName}/organization-memberships`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            const url = new URL(request.url);
            const page = url.searchParams.get('page[number]');
            const pageNumber = page ? parseInt(page) : 1;

            const users = [
              createUser('user-1', 'john.doe'),
              createUser('user-2', 'jane.smith'),
              createUser('user-3', 'service-account'),
            ];

            // Modify user-3 to be a service account
            const serviceAccountUser = users[2];
            if (serviceAccountUser) {
              serviceAccountUser.attributes['is-service-account'] = true;
            }

            const memberships = [
              createMembership('mem-1', 'john.doe@example.com', 'user-1', 'john.doe'),
              createMembership('mem-2', 'jane.smith@example.com', 'user-2', 'jane.smith'),
              createMembership('mem-3', 'service@example.com', 'user-3', 'service-account'),
              createMembership('mem-4', 'invited@example.com', null, null), // Invited user without account
            ];

            const pageSize = 2;
            const totalPages = Math.ceil(memberships.length / pageSize);
            const startIdx = (pageNumber - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const pageData = memberships.slice(startIdx, endIdx);
            const includedUsers = users.filter((user) =>
              pageData.some((mem) => mem.relationships.user.data?.id === user.id)
            );

            return Response.json({
              data: pageData,
              included: includedUsers,
              links: {
                self: request.url,
                first: `${env.TERRAFORM_API_BASE_URL}/api/v2/organizations/${organizationName}/organization-memberships?page[number]=1&page[size]=${pageSize}`,
                prev:
                  pageNumber > 1
                    ? `${
                        env.TERRAFORM_API_BASE_URL
                      }/api/v2/organizations/${organizationName}/organization-memberships?page[number]=${
                        pageNumber - 1
                      }&page[size]=${pageSize}`
                    : null,
                next:
                  pageNumber < totalPages
                    ? `${
                        env.TERRAFORM_API_BASE_URL
                      }/api/v2/organizations/${organizationName}/organization-memberships?page[number]=${
                        pageNumber + 1
                      }&page[size]=${pageSize}`
                    : null,
                last: `${env.TERRAFORM_API_BASE_URL}/api/v2/organizations/${organizationName}/organization-memberships?page[number]=${totalPages}&page[size]=${pageSize}`,
              },
              meta: {
                pagination: {
                  'current-page': pageNumber,
                  'page-size': pageSize,
                  'prev-page': pageNumber > 1 ? pageNumber - 1 : null,
                  'next-page': pageNumber < totalPages ? pageNumber + 1 : null,
                  'total-pages': totalPages,
                  'total-count': memberships.length,
                },
              },
            });
          }
        )
      );
    });

    test('should return memberships with user data for the first page', async () => {
      const result = await getOrganizationMemberships({
        accessToken: validToken,
        organizationName,
        page: null,
      });

      expect(result.memberships).toHaveLength(2);
      expect(result.memberships[0]).toMatchObject({
        membership: {
          id: 'mem-1',
          attributes: {
            email: 'john.doe@example.com',
            username: 'john.doe',
          },
        },
        user: {
          id: 'user-1',
          attributes: {
            username: 'john.doe',
          },
        },
      });
      expect(result.nextPage).toBe(2);
    });

    test('should return memberships for the second page', async () => {
      const result = await getOrganizationMemberships({
        accessToken: validToken,
        organizationName,
        page: 2,
      });

      expect(result.memberships).toHaveLength(2);
      expect(result.memberships[0]).toMatchObject({
        membership: {
          id: 'mem-3',
          attributes: {
            email: 'service@example.com',
            username: 'service-account',
          },
        },
        user: {
          id: 'user-3',
          attributes: {
            'is-service-account': true,
          },
        },
      });
      expect(result.nextPage).toBeNull();
    });

    test('should handle invited users without user data', async () => {
      const result = await getOrganizationMemberships({
        accessToken: validToken,
        organizationName,
        page: 2,
      });

      const invitedMember = result.memberships.find((m) => m.membership.id === 'mem-4');
      expect(invitedMember).toBeDefined();
      expect(invitedMember?.user).toBeNull();
    });

    test('should throw IntegrationConnectionError on 401', async () => {
      await expect(
        getOrganizationMemberships({
          accessToken: 'invalid-token',
          organizationName,
          page: null,
        })
      ).rejects.toThrow(new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' }));
    });

    test('should throw IntegrationError on other errors', async () => {
      server.use(
        http.get(
          `${env.TERRAFORM_API_BASE_URL}/api/v2/organizations/${organizationName}/organization-memberships`,
          () => new Response(undefined, { status: 500 })
        )
      );

      await expect(
        getOrganizationMemberships({
          accessToken: validToken,
          organizationName,
          page: null,
        })
      ).rejects.toThrow(IntegrationError);
    });
  });

  describe('getAuthenticatedUserOrganization', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.TERRAFORM_API_BASE_URL}/api/v2/account/details`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: {
              id: 'user-auth',
              type: 'users',
              attributes: {
                username: 'auth-user',
                email: 'auth@example.com',
                'avatar-url': 'https://www.gravatar.com/avatar/auth',
                'is-service-account': false,
                'two-factor': {
                  enabled: true,
                },
              },
              relationships: {
                organizations: {
                  data: [
                    {
                      id: organizationName,
                      type: 'organizations',
                    },
                  ],
                },
              },
            },
          });
        })
      );
    });

    test('should return user and organization data', async () => {
      const result = await getAuthenticatedUserOrganization(validToken);

      expect(result).toEqual({
        userId: 'user-auth',
        username: 'auth-user',
        email: 'auth@example.com',
        organizationName,
      });
    });

    test('should throw IntegrationConnectionError when user has no organizations', async () => {
      server.use(
        http.get(`${env.TERRAFORM_API_BASE_URL}/api/v2/account/details`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: {
              id: 'user-auth',
              type: 'users',
              attributes: {
                username: 'auth-user',
                email: 'auth@example.com',
                'avatar-url': null,
                'is-service-account': false,
                'two-factor': {
                  enabled: false,
                },
              },
              relationships: {
                organizations: {
                  data: [],
                },
              },
            },
          });
        })
      );

      await expect(getAuthenticatedUserOrganization(validToken)).rejects.toThrow(
        new IntegrationConnectionError('User has no organizations', { type: 'not_admin' })
      );
    });

    test('should throw IntegrationConnectionError on 401', async () => {
      await expect(getAuthenticatedUserOrganization('invalid-token')).rejects.toThrow(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError on other errors', async () => {
      server.use(
        http.get(
          `${env.TERRAFORM_API_BASE_URL}/api/v2/account/details`,
          () => new Response(undefined, { status: 500 })
        )
      );

      await expect(getAuthenticatedUserOrganization(validToken)).rejects.toThrow(IntegrationError);
    });
  });

  describe('deleteOrganizationMembership', () => {
    const membershipId = 'mem-123';

    beforeEach(() => {
      server.use(
        http.delete(
          `${env.TERRAFORM_API_BASE_URL}/api/v2/organization-memberships/${membershipId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            return new Response(undefined, { status: 204 });
          }
        )
      );
    });

    test('should successfully delete organization membership', async () => {
      await expect(
        deleteOrganizationMembership({
          accessToken: validToken,
          membershipId,
        })
      ).resolves.toBeUndefined();
    });

    test('should not throw error when membership not found', async () => {
      server.use(
        http.delete(
          `${env.TERRAFORM_API_BASE_URL}/api/v2/organization-memberships/${membershipId}`,
          () => new Response(undefined, { status: 404 })
        )
      );

      await expect(
        deleteOrganizationMembership({
          accessToken: validToken,
          membershipId,
        })
      ).resolves.toBeUndefined();
    });

    test('should throw IntegrationConnectionError on 401', async () => {
      await expect(
        deleteOrganizationMembership({
          accessToken: 'invalid-token',
          membershipId,
        })
      ).rejects.toThrow(new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' }));
    });

    test('should throw IntegrationError on other errors', async () => {
      server.use(
        http.delete(
          `${env.TERRAFORM_API_BASE_URL}/api/v2/organization-memberships/${membershipId}`,
          () => new Response(undefined, { status: 500 })
        )
      );

      await expect(
        deleteOrganizationMembership({
          accessToken: validToken,
          membershipId,
        })
      ).rejects.toThrow(IntegrationError);
    });
  });
});
