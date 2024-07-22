import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { NotionError } from '../common/error';
import type { NotionUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPage = '2';
const nextPage = '1';

const validUsers: NotionUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  object: 'user',
  type: 'person',
  name: `name-${i}`,
  person: { email: `user-${i}@foo.bar` },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.NOTION_API_BASE_URL}/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('start_cursor');
          return Response.json({
            results: validUsers,
            next_cursor: after === endPage ? null : after,
          });
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
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(NotionError);
    });
  });
});
