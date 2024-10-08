import { http } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { server } from '@elba-security/test-utils';
import { DocusignError } from '../common/error';
import type { DocusignUser } from './users';
import { deleteUsers, getUsers } from './users';

const validToken = 'token-1234';
const API_BASE_URI = 'https://demo.docusign.net';
const accountId = '00000000-0000-0000-0000-000000000001';
const nextUri = `/users?status=Active&start_position=3&count=1`;
const endPosition = '5';
const users = [
  {
    userId: 'test-user-id',
  },
];

const validUsers: DocusignUser[] = Array.from({ length: 5 }, (_, i) => ({
  userId: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  userType: 'CompanyUser',
  permissionProfileName: i === 0 ? 'Account Administrator' : 'DocuSign Sender',
}));

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE_URI}/restapi/v2.1/accounts/${accountId}/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const position = url.searchParams.get('start_position');
        const returnData =
          position !== endPosition
            ? {
                users: validUsers,
                nextUri,
              }
            : {
                users: validUsers,
              };
        return Response.json(returnData);
      })
    );
  });

  test('should fetch users and return next page uri successfully', async () => {
    await expect(
      getUsers({ accessToken: validToken, accountId, apiBaseUri: API_BASE_URI, page: null })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextUri,
    });
  });

  test('should handle pagination when the page params is not null', async () => {
    await expect(
      getUsers({ accessToken: validToken, accountId, apiBaseUri: API_BASE_URI, page: nextUri })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextUri,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getUsers({ accessToken: 'foo-bar', accountId, apiBaseUri: API_BASE_URI, page: null })
    ).rejects.toBeInstanceOf(DocusignError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ userId: string }>(
        `${API_BASE_URI}/restapi/v2.1/accounts/${accountId}/users`,
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
    await expect(
      deleteUsers({ accessToken: validToken, accountId, apiBaseUri: API_BASE_URI, users })
    ).resolves.not.toThrow();
  });

  test('should not throw when the user is not found', async () => {
    await expect(
      deleteUsers({ accessToken: validToken, accountId, apiBaseUri: API_BASE_URI, users })
    ).resolves.toBeUndefined();
  });

  test('should throw DocusignError when token is invalid', async () => {
    await expect(
      deleteUsers({ accessToken: 'foo-bar', accountId, apiBaseUri: API_BASE_URI, users })
    ).rejects.toBeInstanceOf(DocusignError);
  });
});
