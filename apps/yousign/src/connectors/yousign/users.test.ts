/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { YousignError } from '../common/error';
import type { YousignUser } from './users';
import { getUsers } from './users';

const validApiToken = 'apiKey-1234';
const nextCursor = 'test-next-cursor';
const endPage = '2';
const nextPage = '1';
const validUsers: YousignUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`,
  first_name: `firstname-${i}`,
  last_name: `lastname-${i}`,
  is_active: false,
  email: `user-${i}@foo.bar`,
  role: 'owner',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.YOUSIGN_API_BASE_URL}v3/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validApiToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const after = url.searchParams.get('after');
          const responseData = {
            data: validUsers,
            meta: {
              next_cursor: after === endPage ? null : nextCursor,
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey: validApiToken, after: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey: validApiToken, after: endPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ apiKey: 'foo-bar' })).rejects.toBeInstanceOf(YousignError);
    });
  });
});
