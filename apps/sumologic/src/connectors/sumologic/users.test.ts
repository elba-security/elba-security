import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { SumologicError } from '../common/error';
import type { SumologicUser } from './users';
import { getUsers, deleteUser, getOwnerId, getUserDetail } from './users';

const validAccessId = 'accessId-1234';
const validAccessKey = 'accessKey-1234';
const endPage = '2';
const nextPage = '1';
const firstName = 'test-first-name';
const lastName = 'test-last-name';
const accessKey = 'test-accessKey';
const sourceRegion = 'eu';
const userId = 'test-user-id';
const validUsers: SumologicUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `0442f541-45d2-487a-9e4b-de03ce4c559${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  isActive: true,
  isMfaEnabled: false,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`https://api.${sourceRegion}.sumologic.com/api/v1/users`, ({ request }) => {
          const encodedKey = Buffer.from(`${validAccessId}:${validAccessKey}`).toString('base64');

          if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('token');

          const responseData = {
            data: validUsers,
            next: page === endPage ? null : nextPage,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({
          accessId: validAccessId,
          accessKey: validAccessKey,
          sourceRegion,
          page: null,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({
          accessId: validAccessId,
          accessKey: validAccessKey,
          sourceRegion,
          page: endPage,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the Access ID is invalid', async () => {
      await expect(
        getUsers({ accessId: 'foo-bar', accessKey: validAccessKey, sourceRegion, page: null })
      ).rejects.toBeInstanceOf(SumologicError);
    });

    test('should throws when the Access ID is invalid', async () => {
      await expect(
        getUsers({ accessId: validAccessId, accessKey: 'foo-bar', sourceRegion, page: null })
      ).rejects.toBeInstanceOf(SumologicError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.put<{ userId: string }>(
          `https://api.${sourceRegion}.sumologic.com/api/v1/users/:userId`,
          ({ request }) => {
            const encodedKey = Buffer.from(`${validAccessId}:${validAccessKey}`).toString('base64');

            if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
              return new Response(undefined, { status: 401 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );

      server.use(
        http.get<{ userId: string }>(
          `https://api.${sourceRegion}.sumologic.com/api/v1/users/:userId`,
          ({ request }) => {
            const encodedKey = Buffer.from(`${validAccessId}:${validAccessKey}`).toString('base64');

            if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
              return new Response(undefined, { status: 401 });
            }

            return Response.json({ firstName, lastName });
          }
        )
      );
    });

    test('should delete user successfully when access id and access key are valid', async () => {
      await expect(
        deleteUser({
          accessId: validAccessId,
          accessKey: validAccessKey,
          sourceRegion,
          userId,
        })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({
          accessId: validAccessId,
          accessKey: validAccessKey,
          sourceRegion,
          userId: 'invalid-user-id',
        })
      ).resolves.toBeUndefined();
    });

    test('should throw SumologicError when access id is invalid', async () => {
      await expect(
        deleteUser({ accessId: 'invalidAccessId', accessKey, sourceRegion, userId })
      ).rejects.toBeInstanceOf(SumologicError);
    });

    test('should throw SumologicError when access key is invalid', async () => {
      await expect(
        deleteUser({ accessId: validAccessId, accessKey: 'invalidAccessId', sourceRegion, userId })
      ).rejects.toBeInstanceOf(SumologicError);
    });
  });

  describe('getOwnerId', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `https://api.${sourceRegion}.sumologic.com/api/v1/account/accountOwner`,
          ({ request }) => {
            const encodedKey = Buffer.from(`${validAccessId}:${validAccessKey}`).toString('base64');

            if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
              return new Response(undefined, { status: 401 });
            }

            return Response.json(userId);
          }
        )
      );
    });

    test('should return owner id when the access id and access key are valid', async () => {
      await expect(
        getOwnerId({
          accessId: validAccessId,
          accessKey: validAccessKey,
          sourceRegion,
        })
      ).resolves.toStrictEqual({ ownerId: userId });
    });

    test('should throws when the Access ID is invalid', async () => {
      await expect(
        getOwnerId({ accessId: 'foo-bar', accessKey: validAccessKey, sourceRegion })
      ).rejects.toBeInstanceOf(SumologicError);
    });

    test('should throws when the Access Key is invalid', async () => {
      await expect(
        getOwnerId({ accessId: validAccessId, accessKey: 'foo-bar', sourceRegion })
      ).rejects.toBeInstanceOf(SumologicError);
    });
  });

  describe('getUserDetail', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `https://api.${sourceRegion}.sumologic.com/api/v1/users/${userId}`,
          ({ request }) => {
            const encodedKey = Buffer.from(`${validAccessId}:${validAccessKey}`).toString('base64');

            if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
              return new Response(undefined, { status: 401 });
            }

            return Response.json({ firstName, lastName });
          }
        )
      );
    });

    test('should return owner id when the access id and access key are valid', async () => {
      await expect(
        getUserDetail({
          accessId: validAccessId,
          accessKey: validAccessKey,
          sourceRegion,
          userId,
        })
      ).resolves.toStrictEqual({ firstName, lastName });
    });

    test('should throws when the Access ID is invalid', async () => {
      await expect(
        getUserDetail({ accessId: 'foo-bar', accessKey: validAccessKey, sourceRegion, userId })
      ).rejects.toBeInstanceOf(SumologicError);
    });

    test('should throws when the Access Key is invalid', async () => {
      await expect(
        getUserDetail({ accessId: validAccessId, accessKey: 'foo-bar', sourceRegion, userId })
      ).rejects.toBeInstanceOf(SumologicError);
    });
  });
});
