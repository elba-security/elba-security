import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env/server';
import { HarvestError } from '../common/error';
import type { HarvestUser } from './users';
import { getUsers, deleteUser, getAuthUser } from './users';

const validToken = 'token-1234';
const userId = 'test-user-id';
const ownerId = 100000;
const nextPage = 'https://api.harvestapp.com/v2/users?is_active=true&page=2&per_page=2000';
const lastPage = 'https://api.harvestapp.com/v2/users?is_active=truepage=3&per_page=2000';

const validUsers: HarvestUser[] = Array.from({ length: 3 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  access_roles: ['member'],
  is_active: true,
  created_at: '2021-01-01T00:00:00Z',
  updated_at: `2021-01-0${i + 1}T00:00:00Z`,
}));

const invalidUsers = [
  {
    id: 4,
    first_name: 'first_name-4',
    last_name: 'last_name-4',
    email: 'invalid-email',
    access_roles: ['member'],
    is_active: false,
    created_at: '2021-01-01T00:00:00Z',
    updated_at: '2021-01-05T00:00:00Z',
  },
];

describe('users connector', () => {
  describe('getUsers', () => {
    const mockUsersResponse = ({
      hasInvalidUsers = false,
      hasNextPage = false,
      page = null,
      isInvalidToken = false,
    }: {
      hasInvalidUsers?: boolean;
      hasNextPage?: boolean;
      page?: string | null;
      isInvalidToken?: boolean;
    } = {}) => {
      server.use(
        http.get(`${env.HARVEST_API_BASE_URL}/users`, ({ request }) => {
          const token = request.headers.get('Authorization');
          if (isInvalidToken || token !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);

          const usersResponse = {
            users: [...validUsers, ...(hasInvalidUsers ? invalidUsers : [])].flat(),
            links: { next: hasNextPage ? nextPage : null },
          };

          if (page && url.toString() !== page) {
            return Response.json({ users: [], links: { next: null } });
          }

          return Response.json(usersResponse);
        })
      );
    };

    beforeEach(() => {
      mockUsersResponse();
    });

    test('should return users and nextPage when the token is valid and there is another page', async () => {
      // it is the first page of the users, initially there is no page
      mockUsersResponse({ hasNextPage: true, hasInvalidUsers: true, page: null });
      await expect(getUsers({ accessToken: validToken, page: null })).resolves.toStrictEqual({
        invalidUsers: [
          {
            access_roles: ['member'],
            created_at: '2021-01-01T00:00:00Z',
            email: 'invalid-email',
            first_name: 'first_name-4',
            id: 4,
            is_active: false,
            last_name: 'last_name-4',
            updated_at: '2021-01-05T00:00:00Z',
          },
        ],
        validUsers: [
          {
            access_roles: ['member'],
            created_at: '2021-01-01T00:00:00Z',
            email: 'user-1@foo.bar',
            first_name: 'first_name-1',
            id: 1,
            is_active: true,
            last_name: 'last_name-1',
            updated_at: '2021-01-02T00:00:00Z',
          },
          {
            access_roles: ['member'],
            created_at: '2021-01-01T00:00:00Z',
            email: 'user-2@foo.bar',
            first_name: 'first_name-2',
            id: 2,
            is_active: true,
            last_name: 'last_name-2',
            updated_at: '2021-01-03T00:00:00Z',
          },
        ],
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and there is no other page', async () => {
      // it is the last page of the users, there is no next page
      mockUsersResponse({ hasNextPage: false, page: lastPage });

      await expect(getUsers({ accessToken: validToken, page: lastPage })).resolves.toStrictEqual({
        invalidUsers: [],
        validUsers: [
          {
            access_roles: ['member'],
            created_at: '2021-01-01T00:00:00Z',
            email: 'user-1@foo.bar',
            first_name: 'first_name-1',
            id: 1,
            is_active: true,
            last_name: 'last_name-1',
            updated_at: '2021-01-02T00:00:00Z',
          },
          {
            access_roles: ['member'],
            created_at: '2021-01-01T00:00:00Z',
            email: 'user-2@foo.bar',
            first_name: 'first_name-2',
            id: 2,
            is_active: true,
            last_name: 'last_name-2',
            updated_at: '2021-01-03T00:00:00Z',
          },
        ],
        nextPage: null,
      });
    });

    test('should throw HarvestError when the token is invalid', async () => {
      mockUsersResponse({ isInvalidToken: true });

      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toThrow();
    });
  });

  describe('deleteUser', () => {
    const mockDeleteUserResponse = ({
      isUserNotFound = false,
      isInvalidToken = false,
    }: {
      isUserNotFound?: boolean;
      isInvalidToken?: boolean;
    } = {}) => {
      server.use(
        http.patch<{ userId: string }>(
          `${env.HARVEST_API_BASE_URL}/users/:userId`,
          ({ request }) => {
            const token = request.headers.get('Authorization');
            if (isInvalidToken || token !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            return new Response(undefined, { status: isUserNotFound ? 404 : 200 });
          }
        )
      );
    };

    beforeEach(() => {
      mockDeleteUserResponse();
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      mockDeleteUserResponse({ isUserNotFound: true });
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        HarvestError
      );
    });
  });

  describe('getOwnerId', () => {
    const mockAuthUserResponse = ({
      hasValidRole = true,
      isActive = true,
    }: { hasValidRole?: boolean; isActive?: boolean } = {}) => {
      server.use(
        http.get<{ userId: string }>(`${env.HARVEST_API_BASE_URL}/users/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            id: ownerId,
            access_roles: hasValidRole ? ['administrator'] : ['member'],
            is_active: isActive,
          });
        })
      );
    };

    beforeEach(() => {
      mockAuthUserResponse();
    });

    test('should return auth user details when user has a valid role and is active', async () => {
      await expect(getAuthUser(validToken)).resolves.not.toThrow();
    });

    test('should throw HarvestError when user does not have a valid role', async () => {
      mockAuthUserResponse({ hasValidRole: false });
      await expect(getAuthUser(validToken)).rejects.toThrow(
        'User is not account admin or not active'
      );
    });

    test('should throw HarvestError when user is not active', async () => {
      mockAuthUserResponse({ isActive: false });
      await expect(getAuthUser(validToken)).rejects.toThrow(
        'User is not account admin or not active'
      );
    });

    test('should throw HarvestError when token is invalid', async () => {
      await expect(getAuthUser('invalidToken')).rejects.toBeInstanceOf(HarvestError);
    });
  });
});
