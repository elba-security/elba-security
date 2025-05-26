import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { GongError } from '../common/error';
import type { GongUser } from './users';
import { getUsers } from './users';

const userName = 'username-1234';
const password = 'password-1234';
const endPageCursor = 'end-page-cursor';
const nextPageCursor = 'next-page-cursor';
const validEncodedKey = btoa(`${userName}:${password}`);

const validUsers: GongUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  active: false,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.GONG_API_BASE_URL}/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const cursor = url.searchParams.get('cursor');
          const responseData = {
            users: validUsers,
            records:
              cursor !== endPageCursor
                ? {
                    cursor: nextPageCursor,
                  }
                : {},
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ userName, password, page: nextPageCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ userName, password, page: endPageCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ userName, password: 'foo-bar' })).rejects.toBeInstanceOf(GongError);
    });
  });
});
