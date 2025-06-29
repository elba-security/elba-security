import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationConnectionError } from '@elba-security/common';
import type { JiraUser } from './users';
import { getUsers, deleteUser } from './users';

const validAccessToken = 'access-token-1234';
const endPage = '2';
const userId = 'test-id';
const domain = 'test-domain';

const validUsers: JiraUser[] = Array.from({ length: 5 }, (_, i) => ({
  accountId: `accountId-${i}`,
  displayName: `displayName-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  active: true,
  accountType: 'atlassian',
}));

const endPageUsers: JiraUser[] = Array.from({ length: 1 }, (_, i) => ({
  accountId: `accountId-${i}`,
  displayName: `displayName-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  active: true,
  accountType: 'atlassian',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`https://${domain}.atlassian.net/rest/api/3/users/search`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validAccessToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const after = url.searchParams.get('startAt');
          const responseData = after === endPage ? endPageUsers : validUsers;
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validAccessToken, domain, page: null })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: 5,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validAccessToken, domain, page: endPage })
      ).resolves.toStrictEqual({
        validUsers: endPageUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'invalid-token', domain })).rejects.toBeInstanceOf(
        IntegrationConnectionError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ accountId: string }>(
          `https://${domain}.atlassian.net/rest/api/3/user`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validAccessToken}`) {
              return new Response(undefined, { status: 401 });
            }

            const url = new URL(request.url);
            const accountId = url.searchParams.get('accountId');

            if (accountId !== userId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ accessToken: validAccessToken, domain, userId })
      ).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validAccessToken, domain, userId: 'invalid-user-id' })
      ).resolves.toBeUndefined();
    });

    test('should throw IntegrationConnectionError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalid-token', domain, userId })
      ).rejects.toBeInstanceOf(IntegrationConnectionError);
    });
  });
});
