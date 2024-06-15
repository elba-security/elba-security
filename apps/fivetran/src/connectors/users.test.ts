/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { type FivetranUser, getUsers, deleteUser } from './users';
import { FivetranError } from './commons/error';

const nextCursor = 'next-cursor';
const apiKey = 'test-api-key';
const apiSecret = 'test-api-secret';
const userId = 'test-user-id';
const validUsers: FivetranUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  role: `Account Administrator`,
  given_name: `given_name-${i}`,
  family_name: `family_name-${i}`,
  email: `user-${i}@foo.bar`,
  active: true,
  invited: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        const encodedKey = btoa(`${apiKey}:${apiSecret}`);

        if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');

        return Response.json({
          data: {
            items: validUsers,
            ...(cursor ? { next_cursor: nextCursor } : {}),
          },
        });
      };
      server.use(http.get(`${env.FIVETRAN_API_BASE_URL}/users`, resolver));
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, apiSecret, cursor: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, apiSecret, cursor: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          apiSecret: 'foo-id',
          cursor: nextCursor,
        })
      ).rejects.toBeInstanceOf(FivetranError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string; apiKey: string; apiSecret: string }>(
          `${env.FIVETRAN_API_BASE_URL}/users/:userId`,
          ({ request, params }) => {
            const encodedKey = btoa(`${apiKey}:${apiSecret}`);

            if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.userId !== userId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when apiKey is valid', async () => {
      await expect(deleteUser({ apiKey, userId, apiSecret })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ apiKey, userId: 'invalid-user-id', apiSecret })
      ).resolves.toBeUndefined();
    });

    test('should throw FivetranError when the apiSecret is invalid', async () => {
      await expect(
        deleteUser({ apiKey, userId, apiSecret: 'invalid-account-id' })
      ).rejects.toBeInstanceOf(FivetranError);
    });

    test('should throw FivetranError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidKey', userId, apiSecret })).rejects.toBeInstanceOf(
        FivetranError
      );
    });
  });
});
