import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../../vitest/setup-msw-handlers';
import { type GitlabUser, getUsers } from './users';
import { GitlabError } from './commons/error';

const validToken = 'token-1234';
const endPage = '1';

const users: GitlabUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get('https://gitlab.com/api/v4/users', ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const page = url.searchParams.get('id_after');

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
          return Response.json(users, {
            headers: {
              Link:
                page === endPage
                  ? ''
                  : `<https://gitlab.example.com/api/v4/projects?pagination=keyset&per_page=50&order_by=id&sort=asc&id_after=${endPage}>; rel="next"`,
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: null })).resolves.toStrictEqual({
        nextPage: Number(endPage),
        users,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        nextPage: null,
        users,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', page: '1' })).rejects.toBeInstanceOf(
        GitlabError
      );
    });
  });
});
