import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { CloseError } from '../common/error';
import type { CloseUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPageToken = 3;
const nextPageToken = 2;

const validUsers: CloseUser[] = Array.from({ length: 5 }, (_, i) => ({
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  email: `user-${i}@foo.bar`,
  id: `https://test-uri/users/00000000-0000-0000-0000-00000000009${i}`,
  organizations: ['test-org-1', 'test-org-2'],
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.CLOSE_API_BASE_URL}/api/v1/user`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageToken = url.searchParams.get('_skip') || '0';
          const responseData = {
            data: validUsers,
            has_more: parseInt(pageToken, 10) !== endPageToken,
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPageToken })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageToken + env.CLOSE_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: endPageToken })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', page: null })).rejects.toBeInstanceOf(
        CloseError
      );
    });
  });
});
