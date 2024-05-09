/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { JiraError } from '../common/error';
import type { JiraUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'token-1234';
const endPage = '2';
const nextPage = '1';
const userId = 'test-id';
const cloudId = 'test-cloud-id';
const validUsers: JiraUser[] = Array.from({ length: 21 }, (_, i) => ({
  accountId: `accountId-${i}`,
  displayName: `displayName-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  active: true,
}));
const endPageUsers: JiraUser[] = Array.from({ length: 1 }, (_, i) => ({
  accountId: `accountId-${i}`,
  displayName: `displayName-${i}`,
  emailAddress: `user-${i}@foo.bar`,
  active: true,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.JIRA_API_BASE_URL}ex/jira/${cloudId}/rest/api/3/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
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
        getUsers({ accessToken: validToken, cloudId, page: nextPage })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(nextPage, 10) + env.JIRA_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, cloudId, page: endPage })
      ).resolves.toStrictEqual({
        validUsers: endPageUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', cloudId })).rejects.toBeInstanceOf(JiraError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.JIRA_API_BASE_URL}ex/jira/${cloudId}/rest/api/3/user?accountId=${userId}`,
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
      await expect(deleteUser({ accessToken: validToken, cloudId, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ accessToken: validToken, cloudId, userId })
      ).resolves.toBeUndefined();
    });

    test('should throw JiraError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', cloudId, userId })
      ).rejects.toBeInstanceOf(JiraError);
    });
  });
});
