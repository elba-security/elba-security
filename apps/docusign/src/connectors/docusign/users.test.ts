import { http } from 'msw';
import { describe, expect, test } from 'vitest';
import { server } from '@elba-security/test-utils';
import { DocusignError } from '../common/error';
import type { DocusignUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const API_BASE_URI = 'https://demo.docusign.net';
const accountId = '00000000-0000-0000-0000-000000000001';
const nextUri = `/users?status=Active&start_position=3&count=1`;

const validUsers: DocusignUser[] = Array.from({ length: 5 }, (_, i) => ({
  userId: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  userType: 'CompanyUser',
  permissionProfileName: i === 0 ? 'Account Administrator' : 'DocuSign Sender',
}));

const invalidUsers = [];

const setup = ({ shouldReturnNextPageUri = false }: { shouldReturnNextPageUri?: boolean }) => {
  server.use(
    http.get(`${API_BASE_URI}/restapi/v2.1/accounts/${accountId}/users`, ({ request }) => {
      if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
        return new Response(undefined, { status: 401 });
      }

      return Response.json({
        users: validUsers,
        ...(shouldReturnNextPageUri ? { nextUri } : {}),
      });
    })
  );
};

describe('users connector', () => {
  describe('getUsers', () => {
    test('should fetch users and return next page uri successfully', async () => {
      setup({ shouldReturnNextPageUri: true });
      await expect(
        getUsers({ accessToken: validToken, accountId, apiBaseUri: API_BASE_URI, page: null })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextUri,
      });
    });

    test('should handle pagination when the page params is not null', async () => {
      setup({ shouldReturnNextPageUri: false });
      await expect(
        getUsers({ accessToken: validToken, accountId, apiBaseUri: API_BASE_URI, page: nextUri })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      setup({});

      await expect(
        getUsers({ accessToken: 'foo-bar', accountId, apiBaseUri: API_BASE_URI, page: null })
      ).rejects.toBeInstanceOf(DocusignError);
    });
  });
});
