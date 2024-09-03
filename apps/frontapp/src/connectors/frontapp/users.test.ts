import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { FrontappError } from '../common/error';
import type { FrontappUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPage = `${env.FRONTAPP_API_BASE_URL}/teammates?limit=${env.FRONTAPP_USERS_SYNC_BATCH_SIZE}&page_token=endpagetoken`;
const nextPage = `${env.FRONTAPP_API_BASE_URL}/teammates?limit=${env.FRONTAPP_USERS_SYNC_BATCH_SIZE}&page_token=nextpagetoken`;

const validUsers: FrontappUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  email: `user-${i}@foo.bar`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  is_admin: false,
  is_blocked: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.FRONTAPP_API_BASE_URL}/teammates`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageToken = url.searchParams.get('page_token');
          const responseData =
            pageToken === 'endpagetoken'
              ? {
                  _pagination: {
                    next: null,
                  },
                  _results: validUsers,
                }
              : {
                  _pagination: {
                    next: nextPage,
                  },
                  _results: validUsers,
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
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(FrontappError);
    });
  });
});
