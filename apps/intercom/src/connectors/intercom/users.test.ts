import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { IntercomError } from '../common/error';
import type { IntercomUser } from './users';
import { getUsers, getAuthUser } from './users';

const validToken = 'token-1234';
const endPage = '3';
const nextPage = 'next-page';

const validUsers: IntercomUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.INTERCOM_API_BASE_URL}/admins`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const startingAfter = url.searchParams.get('starting_after');
          const responseData =
            startingAfter !== endPage
              ? {
                  admins: validUsers,
                  pages: {
                    page: 3,
                    per_page: 20,
                    next: {
                      starting_after: nextPage,
                    },
                  },
                }
              : {
                  admins: validUsers,
                };

          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(IntercomError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.INTERCOM_API_BASE_URL}/me`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            app: {
              id_code: 'workspace-id',
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({
        workspaceId: 'workspace-id',
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getAuthUser('foo-bar')).rejects.toBeInstanceOf(IntercomError);
    });
  });
});
