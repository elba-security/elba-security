import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { AirslateError } from '../common/error';
import type { AirslateUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPageToken = '3';
const nextPageToken = '2';
const userId = 'test-user-id';

const validUsers: AirslateUser[] = Array.from({ length: 5 }, (_, i) => ({
  uri: `uri-${i}`,
  user: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    uri: `https://test-uri/users/00000000-0000-0000-0000-00000000009${i}`,
  },
  role: 'user',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.AIRSLATE_API_BASE_URL}/organization_memberships`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const pageToken = url.searchParams.get('page_token');
          const responseData = {
            collection: validUsers,
            pagination: {
              next_page_token: pageToken === endPageToken ? null : nextPageToken,
            },
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
        nextPage: nextPageToken,
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
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(AirslateError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.AIRSLATE_API_BASE_URL}/organization_memberships/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ accessToken: validToken, userId })).resolves.toBeUndefined();
    });

    test('should throw AirslateError when token is invalid', async () => {
      await expect(deleteUser({ accessToken: 'invalidToken', userId })).rejects.toBeInstanceOf(
        AirslateError
      );
    });
  });
});
