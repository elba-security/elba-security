import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SendgridError } from '../commons/error';
import { type SendgridUser } from './users';
import { getUsers, deleteUser } from './users';

const userId = 'test-user-id';
const nextCursor = 1;
const offset = 0;
const endPageOffset = 2;
const apiKey = 'test-api-key';
const validUsers: SendgridUser[] = Array.from(
  { length: env.SENDGRID_USERS_SYNC_BATCH_SIZE },
  (_, i) => ({
    username: `username-${i}`,
    email: `user-${i}@foo.bar`,
    first_name: `first_name-${i}`,
    last_name: `last_name-${i}`,
    is_admin: false,
  })
);

const endPageUsers: SendgridUser[] = Array.from({ length: 2 }, (_, i) => ({
  username: `endpage-username-${i}`,
  email: `endpage-user-${i}@foo.bar`,
  first_name: `endpage-first_name-${i}`,
  last_name: `endpage-last_name-${i}`,
  is_admin: false,
}));
const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('offset');

        const returnData = {
          result: after && parseInt(after, 10) === endPageOffset ? endPageUsers : validUsers,
        };

        return Response.json(returnData);
      };
      server.use(http.get(`${env.SENDGRID_API_BASE_URL}/v3/teammates`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another offset', async () => {
      await expect(getUsers({ apiKey, offset })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: offset + env.SENDGRID_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other offset', async () => {
      await expect(getUsers({ apiKey, offset: endPageOffset })).resolves.toStrictEqual({
        validUsers: endPageUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          offset: nextCursor,
        })
      ).rejects.toBeInstanceOf(SendgridError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.SENDGRID_API_BASE_URL}/v3/teammates/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ apiKey, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey, userId })).resolves.toBeUndefined();
    });

    test('should throw SendgridError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalid-Api-Key', userId })).rejects.toBeInstanceOf(
        SendgridError
      );
    });
  });
});
