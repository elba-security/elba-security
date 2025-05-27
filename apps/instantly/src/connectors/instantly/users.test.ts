import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { InstantlyError } from '../common/error';
import type { InstantlyUser } from './users';
import { getUsers, deleteUser } from './users';

const validApiToken = 'apiKey-1234';
const endPage = 'end-page-id';
const nextPage = 'next-page-id';
const userId = 'test-id';

const validUsers: InstantlyUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  email: `user-${i}@foo.bar`,
  accepted: true,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.INSTANTLY_API_BASE_URL}/api/v2/workspace-members`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validApiToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const after = url.searchParams.get('starting_after');
          const responseData =
            after === endPage
              ? {
                  items: [],
                }
              : {
                  items: validUsers,
                  next_starting_after: endPage,
                };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey: validApiToken, page: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: endPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey: validApiToken, page: endPage })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ apiKey: 'foo-bar' })).rejects.toBeInstanceOf(InstantlyError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.INSTANTLY_API_BASE_URL}/api/v2/workspace-members/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validApiToken}`) {
              return new Response(undefined, { status: 401 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ apiKey: validApiToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey: validApiToken, userId })).resolves.toBeUndefined();
    });

    test('should throw InstantlyError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidApiToken', userId })).rejects.toBeInstanceOf(
        InstantlyError
      );
    });
  });
});
