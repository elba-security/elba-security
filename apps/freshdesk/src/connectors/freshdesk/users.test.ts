import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { FreshdeskError } from '../common/error';
import type { FreshdeskUser } from './users';
import { getUsers, deleteUser, getAuthUser } from './users';

const endPage = 3;
const nextPage = 2;
const userId = 'test-user-id';

const userName = 'user-name';
const password = 'password';
const subDomain = 'test-domain';
const validEncodedKey = btoa(`${userName}:${password}`);

const validUsers: FreshdeskUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  contact: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    active: true,
  },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`https://${subDomain}.freshdesk.com/api/v2/agents`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page') || '0';
          const responseData = parseInt(page, 10) !== endPage ? validUsers : [];

          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ userName, password, subDomain, page: nextPage })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPage + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ userName, password, subDomain, page: endPage })
      ).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ userName: 'foo-bar', password, subDomain, page: null })
      ).rejects.toBeInstanceOf(FreshdeskError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `https://${subDomain}.freshdesk.com/api/v2/agents/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ userName, password, subDomain, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ userName, password, subDomain, userId })).resolves.toBeUndefined();
    });

    test('should throw FreshdeskError when token is invalid', async () => {
      await expect(
        deleteUser({ userName: 'invalidToken', password, subDomain, userId })
      ).rejects.toBeInstanceOf(FreshdeskError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`https://${subDomain}.freshdesk.com/api/v2/account`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
            return new Response(undefined, { status: 401 });
          }
          const responseData = {
            contact_person: {
              email: 'test@email.com',
            },
          };

          return Response.json(responseData);
        })
      );
    });

    test('should get account info successfully when token is valid', async () => {
      await expect(getAuthUser({ userName, password, subDomain })).resolves.not.toThrow();
    });

    test('should throw FreshdeskError when token is invalid', async () => {
      await expect(
        getAuthUser({ userName: 'invalidToken', password, subDomain })
      ).rejects.toBeInstanceOf(FreshdeskError);
    });
  });
});
