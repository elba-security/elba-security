import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { TeamtailorUser } from './users';
import { getUsers, validateApiKey, deleteUser } from './users';

const validToken = 'valid-token-1234';
const nextPageUrl = `${env.TEAMTAILOR_API_BASE_URL}/v1/users?page[number]=2`;

const createValidUser = (id: string): TeamtailorUser => ({
  id,
  type: 'users',
  attributes: {
    email: `user${id}@example.com`,
    name: `First${id} Last${id}`,
    username: `user${id}`,
    role: 'User',
    title: 'Software Engineer',
    visible: true,
    'login-email': `user${id}@example.com`,
    picture: {
      standard: `https://example.com/pic/${id}.jpg`,
    },
  },
  relationships: {
    department: {
      links: {
        self: `https://api.teamtailor.com/v1/users/${id}/relationships/department`,
        related: `https://api.teamtailor.com/v1/users/${id}/department`,
      },
    },
    teams: {
      links: {
        self: `https://api.teamtailor.com/v1/users/${id}/relationships/teams`,
        related: `https://api.teamtailor.com/v1/users/${id}/teams`,
      },
    },
  },
});

const validUsers = Array.from({ length: 5 }, (_, i) => createValidUser(String(i)));

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.TEAMTAILOR_API_BASE_URL}/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Token token=${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageNumber = url.searchParams.get('page[number]');

          const responseData = {
            data: validUsers,
            meta: {
              'page-count': 2,
              'record-count': 10,
            },
            links: {
              first: `${env.TEAMTAILOR_API_BASE_URL}/v1/users?page[number]=1`,
              last: `${env.TEAMTAILOR_API_BASE_URL}/v1/users?page[number]=2`,
              ...(pageNumber !== '2' ? { next: nextPageUrl } : {}),
            },
          };

          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and there is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers: [],
        nextPage: nextPageUrl,
      });
    });

    test('should return users and no nextPage when the token is valid and there is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: nextPageUrl })).resolves.toStrictEqual(
        {
          validUsers,
          invalidUsers: [],
          nextPage: null,
        }
      );
    });

    test('should throw IntegrationConnectionError when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'invalid-token' })).rejects.toThrow(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(
        http.get(`${env.TEAMTAILOR_API_BASE_URL}/v1/users`, () => {
          return new Response(undefined, { status: 500 });
        })
      );

      await expect(getUsers({ accessToken: validToken })).rejects.toBeInstanceOf(IntegrationError);
    });
  });

  describe('validateApiKey', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.TEAMTAILOR_API_BASE_URL}/v1/users`, ({ request }) => {
          const auth = request.headers.get('Authorization');

          if (auth === `Token token=${validToken}`) {
            return Response.json({
              data: [createValidUser('1')],
              meta: { 'page-count': 1, 'record-count': 1 },
              links: {},
            });
          }

          if (auth === 'Token token=forbidden-token') {
            return new Response(undefined, { status: 403 });
          }

          return new Response(undefined, { status: 401 });
        })
      );
    });

    test('should return true when the API key is valid', async () => {
      await expect(validateApiKey(validToken)).resolves.toBe(true);
    });

    test('should throw IntegrationConnectionError with unauthorized type when API key is invalid', async () => {
      await expect(validateApiKey('invalid-token')).rejects.toThrow(
        new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' })
      );
    });

    test('should throw IntegrationConnectionError with not_admin type when user lacks permissions', async () => {
      await expect(validateApiKey('forbidden-token')).rejects.toThrow(
        new IntegrationConnectionError('User does not have sufficient permissions', {
          type: 'not_admin',
        })
      );
    });

    test('should throw IntegrationError for other errors', async () => {
      server.use(
        http.get(`${env.TEAMTAILOR_API_BASE_URL}/v1/users`, () => {
          return new Response(undefined, { status: 500 });
        })
      );

      await expect(validateApiKey(validToken)).rejects.toBeInstanceOf(IntegrationError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete(`${env.TEAMTAILOR_API_BASE_URL}/v1/users/:userId`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Token token=${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const { userId } = params;

          if (userId === 'non-existent') {
            return new Response(undefined, { status: 404 });
          }

          return new Response(undefined, { status: 204 });
        })
      );
    });

    test('should successfully delete a user', async () => {
      await expect(deleteUser(validToken, 'user-123')).resolves.toBe(true);
    });

    test('should return true even if user does not exist', async () => {
      await expect(deleteUser(validToken, 'non-existent')).resolves.toBe(true);
    });

    test('should throw IntegrationError for server errors', async () => {
      server.use(
        http.delete(`${env.TEAMTAILOR_API_BASE_URL}/v1/users/:userId`, () => {
          return new Response(undefined, { status: 500 });
        })
      );

      await expect(deleteUser(validToken, 'user-123')).rejects.toBeInstanceOf(IntegrationError);
    });
  });
});
