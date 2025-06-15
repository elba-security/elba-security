import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { GitLabUser, GitLabAuthUser } from './users';
import { getAuthUser, getUsers, deactivateUser } from './users';

// Test data setup
const validToken = 'valid-token-1234';
const adminToken = 'admin-token-1234';
const nextUri = `${env.GITLAB_API_BASE_URL}/api/v4/users?page=2&per_page=100`;

// Create sample valid GitLab users based on actual API response
const validUsers: GitLabUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  username: `user${i}`,
  name: `User ${i}`,
  state: 'active',
  locked: false,
  avatar_url: `https://gitlab.com/uploads/-/system/user/avatar/${i + 1}/avatar.png`,
  web_url: `https://gitlab.com/user${i}`,
}));

// Admin user has additional fields
const adminUsers: GitLabUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i + 10,
  username: `admin${i}`,
  name: `Admin ${i}`,
  state: 'active',
  locked: false,
  avatar_url: null,
  web_url: `https://gitlab.com/admin${i}`,
  // These fields only appear when requester is admin
  email: `admin${i}@example.com`,
  created_at: '2023-01-01T00:00:00.000Z',
  is_admin: true,
}));

// Invalid user missing required fields
const invalidUser = {
  id: 'invalid-id', // Should be number
  username: 'invalid',
  // Missing required fields: name, state, locked, avatar_url, web_url
};

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      // Set up MSW to intercept GitLab API calls
      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/users`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');

          // Check authorization
          if (
            !authHeader ||
            (!authHeader.includes(validToken) && !authHeader.includes(adminToken))
          ) {
            return new Response(undefined, { status: 401 });
          }

          // Handle pagination
          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const isAdmin = authHeader.includes(adminToken);

          // Return users based on whether requester is admin
          const users = isAdmin ? [...validUsers, ...adminUsers] : validUsers;

          // Create response headers
          const headers = new Headers();

          // Add Link header for pagination when not on last page
          if (page !== '2') {
            headers.set('Link', `<${nextUri}>; rel="next"`);
          }

          return new Response(JSON.stringify(users), { headers });
        })
      );
    });

    test('should return users with pagination (non-admin token)', async () => {
      const result = await getUsers({ accessToken: validToken, page: null });

      expect(result).toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: nextUri,
      });
    });

    test('should return users with admin fields when using admin token', async () => {
      const result = await getUsers({ accessToken: adminToken, page: null });

      expect(result.validUsers).toHaveLength(validUsers.length + adminUsers.length);
      expect(result.invalidUsers).toHaveLength(0);
      expect(result.nextPage).toBe(nextUri);

      // Check that admin users have email field
      const adminUser = result.validUsers.find((u) => u.id === 10);
      expect(adminUser?.email).toBe('admin0@example.com');
    });

    test('should return users without next page on last page', async () => {
      const result = await getUsers({ accessToken: validToken, page: nextUri });

      expect(result).toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: null,
      });
    });

    test('should throw IntegrationConnectionError for invalid token', async () => {
      await expect(getUsers({ accessToken: 'invalid-token' })).rejects.toBeInstanceOf(
        IntegrationConnectionError
      );
    });

    test('should filter out bot users', async () => {
      const botUser: GitLabUser = {
        id: 999,
        username: 'bot-user',
        name: 'Bot User',
        state: 'active',
        locked: false,
        avatar_url: null,
        web_url: 'https://gitlab.com/bot-user',
        bot: true,
      };

      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json([...validUsers, botUser]);
        })
      );

      const result = await getUsers({ accessToken: validToken, page: null });

      // Bot user should be filtered out
      expect(result.validUsers).toHaveLength(validUsers.length);
      expect(result.validUsers.find((u) => u.username === 'bot-user')).toBeUndefined();
    });

    test('should filter out external users', async () => {
      const externalUser: GitLabUser = {
        id: 998,
        username: 'external-user',
        name: 'External User',
        state: 'active',
        locked: false,
        avatar_url: null,
        web_url: 'https://gitlab.com/external-user',
        external: true,
      };

      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json([...validUsers, externalUser]);
        })
      );

      const result = await getUsers({ accessToken: validToken, page: null });

      // External user should be filtered out
      expect(result.validUsers).toHaveLength(validUsers.length);
      expect(result.validUsers.find((u) => u.username === 'external-user')).toBeUndefined();
    });

    test('should filter out non-active users', async () => {
      const blockedUser: GitLabUser = {
        id: 997,
        username: 'blocked-user',
        name: 'Blocked User',
        state: 'blocked',
        locked: true,
        avatar_url: null,
        web_url: 'https://gitlab.com/blocked-user',
      };

      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json([...validUsers, blockedUser]);
        })
      );

      const result = await getUsers({ accessToken: validToken, page: null });

      // Blocked user should be filtered out
      expect(result.validUsers).toHaveLength(validUsers.length);
      expect(result.validUsers.find((u) => u.username === 'blocked-user')).toBeUndefined();
    });

    test('should handle invalid user data', async () => {
      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json([...validUsers, invalidUser]);
        })
      );

      const result = await getUsers({ accessToken: validToken, page: null });

      expect(result.validUsers).toHaveLength(validUsers.length);
      expect(result.invalidUsers).toHaveLength(1);
      expect(result.invalidUsers[0]).toStrictEqual(invalidUser);
    });
  });

  describe('getAuthUser', () => {
    const setup = ({ isAdmin }: { isAdmin: boolean }) => {
      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/user`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          // Return a sample authenticated user
          const authUser: GitLabAuthUser = {
            id: 1,
            username: 'auth-user',
            email: 'auth@example.com',
            name: 'Authenticated User',
            state: 'active',
            avatar_url: null,
            web_url: 'https://gitlab.com/auth-user',
            created_at: '2023-01-01T00:00:00.000Z',
            bio: null,
            location: null,
            public_email: null,
            organization: '',
            job_title: '',
            can_create_group: true,
            can_create_project: true,
            two_factor_enabled: false,
            external: false,
            // Only include is_admin if user is actually admin
            ...(isAdmin && { is_admin: true }),
          };
          return Response.json(authUser);
        })
      );
    };

    test('should successfully retrieve admin user data', async () => {
      setup({ isAdmin: true });
      const result = await getAuthUser(validToken);

      expect(result.id).toBe(1);
      expect(result.username).toBe('auth-user');
      expect(result.email).toBe('auth@example.com');
      expect(result.is_admin).toBe(true);
    });

    test('should throw when user is not admin', async () => {
      setup({ isAdmin: false });

      await expect(getAuthUser(validToken)).rejects.toThrow(
        new IntegrationConnectionError('User is not admin', {
          type: 'not_admin',
          metadata: expect.any(Object),
        })
      );

      // Verify the error type and contains metadata
      try {
        await getAuthUser(validToken);
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrationConnectionError);
        if (error instanceof IntegrationConnectionError) {
          expect(error.type).toBe('not_admin');
          expect(error.metadata).toBeDefined();
        }
      }
    });

    test('should throw when token is invalid', async () => {
      setup({ isAdmin: false });
      await expect(getAuthUser('invalid-token')).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });
  });

  describe('deactivateUser', () => {
    test('should successfully deactivate a user', async () => {
      server.use(
        http.post(`${env.GITLAB_API_BASE_URL}/api/v4/users/123/deactivate`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          // According to docs, successful deactivation returns 201
          return new Response(null, { status: 201 });
        })
      );

      await expect(deactivateUser(validToken, '123')).resolves.toBeUndefined();
    });

    test('should throw when token is invalid', async () => {
      server.use(
        http.post(`${env.GITLAB_API_BASE_URL}/api/v4/users/123/deactivate`, () => {
          return new Response(undefined, { status: 401 });
        })
      );

      await expect(deactivateUser('invalid-token', '123')).rejects.toStrictEqual(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw when user lacks permissions or user not eligible', async () => {
      server.use(
        http.post(`${env.GITLAB_API_BASE_URL}/api/v4/users/123/deactivate`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 403 });
        })
      );

      await expect(deactivateUser(validToken, '123')).rejects.toStrictEqual(
        new IntegrationConnectionError(
          'Cannot deactivate user - insufficient permissions or user is not eligible',
          {
            type: 'not_admin',
          }
        )
      );
    });

    test('should not throw when user is not found', async () => {
      server.use(
        http.post(`${env.GITLAB_API_BASE_URL}/api/v4/users/123/deactivate`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 404 });
        })
      );

      await expect(deactivateUser(validToken, '123')).resolves.toBeUndefined();
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(
        http.post(`${env.GITLAB_API_BASE_URL}/api/v4/users/123/deactivate`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 500 });
        })
      );

      await expect(deactivateUser(validToken, '123')).rejects.toBeInstanceOf(IntegrationError);
    });
  });
});
