import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { GitLabUser, GitLabAuthUser } from './users';
import { getAuthUser, getUsers, deactivateUser } from './users';

// Test data setup
const validToken = 'valid-token-1234';
const nextUri = `${env.GITLAB_API_BASE_URL}/api/v4/users?page=2&per_page=100`;

// Create sample valid GitLab users for testing
const validUsers: GitLabUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1,
  username: `user${i}`,
  email: `user${i}@example.com`,
  name: `User ${i}`,
  state: 'active',
  avatar_url: `https://gitlab.com/uploads/-/system/user/avatar/${i + 1}/avatar.png`,
  web_url: `https://gitlab.com/user${i}`,
  created_at: '2023-01-01T00:00:00.000Z',
  is_admin: false,
  bot: false,
  external: false,
}));

// Invalid user for testing error cases
const invalidUser = {
  id: 'invalid-id', // Should be number
  username: 'invalid',
  // Missing required fields
};

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      // Set up MSW to intercept GitLab API calls
      server.use(
        http.get(`${env.GITLAB_API_BASE_URL}/api/v4/users`, ({ request }) => {
          // Validate the access token
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          // Handle pagination
          const url = new URL(request.url);
          const page = url.searchParams.get('page');

          // Return users array directly (GitLab API format)
          const headers = new Headers();

          // Add Link header for pagination when not on last page
          if (page !== '2') {
            headers.set('Link', `<${nextUri}>; rel="next"`);
          }

          return new Response(JSON.stringify(validUsers), { headers });
        })
      );
    });

    test('should return users and nextPage when the token is valid and there is another page', async () => {
      // Test the initial page of results
      const result = await getUsers({ accessToken: validToken, page: null });

      expect(result).toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: nextUri,
      });
    });

    test('should return users and no nextPage when the token is valid and there is no other page', async () => {
      // Test the final page of results
      const result = await getUsers({ accessToken: validToken, page: nextUri });

      expect(result).toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: null,
      });
    });

    test('should throw when the token is invalid', async () => {
      // Test error handling for invalid authentication
      await expect(getUsers({ accessToken: 'invalid-token' })).rejects.toBeInstanceOf(
        IntegrationConnectionError
      );
    });

    test('should filter out bot users', async () => {
      const botUser: GitLabUser = {
        id: 999,
        username: 'bot-user',
        email: 'bot@example.com',
        name: 'Bot User',
        state: 'active',
        avatar_url: null,
        web_url: 'https://gitlab.com/bot-user',
        created_at: '2023-01-01T00:00:00.000Z',
        is_admin: false,
        bot: true,
        external: false,
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
      // Set up MSW to intercept authenticated user endpoint
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
            is_admin: isAdmin,
          };
          return Response.json(authUser);
        })
      );
    };

    test('should successfully retrieve and parse user data', async () => {
      setup({ isAdmin: true });
      const result = await getAuthUser(validToken);

      expect(result).toStrictEqual({
        id: 1,
        username: 'auth-user',
        email: 'auth@example.com',
        name: 'Authenticated User',
        state: 'active',
        avatar_url: null,
        web_url: 'https://gitlab.com/auth-user',
        created_at: '2023-01-01T00:00:00.000Z',
        is_admin: true,
      });
    });

    test('should throw when the authenticated user is not an admin', async () => {
      setup({ isAdmin: false });
      await expect(getAuthUser(validToken)).rejects.toStrictEqual(
        new IntegrationConnectionError('User is not admin', {
          type: 'not_admin',
          metadata: {
            id: 1,
            username: 'auth-user',
            email: 'auth@example.com',
            name: 'Authenticated User',
            state: 'active',
            avatar_url: null,
            web_url: 'https://gitlab.com/auth-user',
            created_at: '2023-01-01T00:00:00.000Z',
            is_admin: false,
          },
        })
      );
    });

    test('should throw when the token is invalid', async () => {
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

    test('should throw when user lacks admin permissions', async () => {
      server.use(
        http.post(`${env.GITLAB_API_BASE_URL}/api/v4/users/123/deactivate`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 403 });
        })
      );

      await expect(deactivateUser(validToken, '123')).rejects.toStrictEqual(
        new IntegrationConnectionError('Insufficient permissions to deactivate user', {
          type: 'not_admin',
        })
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
