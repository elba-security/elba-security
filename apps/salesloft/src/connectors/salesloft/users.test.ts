import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SalesloftError } from '../common/error';
import type { SalesloftUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPageToken = 3;
const nextPageToken = 2;

const validUsers: SalesloftUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.SALESLOFT_API_BASE_URL}/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageToken = url.searchParams.get('page') ?? '0';
          const responseData = {
            data: validUsers,
            metadata: {
              paging: { next_page: pageToken === String(endPageToken) ? null : nextPageToken },
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: String(nextPageToken) })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: String(nextPageToken),
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: String(endPageToken) })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(SalesloftError);
    });
  });
});
