import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../../vitest/setup-msw-handlers';
import { getUsers } from './users';
import type { JiraUser } from './users';
import { JiraError } from './commons/error';

const accessToken = 'token-1234';
const cloudId = 'some-cloud-id';
const usersSyncBatchSize = env.USERS_SYNC_BATCH_SIZE;
const startAt = 0;

const invalidUsers = [
  {
    mail: `user-invalid@foo.bar`,
    displayName: `user invalid`,
  },
];

const validUsers: JiraUser[] = Array.from(
  { length: usersSyncBatchSize - invalidUsers.length },
  (_, i) => ({
    accountId: `user-id-${i}`,
    emailAddress: `user-${i}@foo.bar`,
    displayName: `user ${i}`,
  })
);

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.JIRA_API_BASE_URL}/:cloudId/rest/api/3/users`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.cloudId !== cloudId) {
            return new Response(undefined, { status: 404 });
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
          return Response.json([...validUsers, ...invalidUsers]);
        })
      );
    });
    test('should return users and startAtNext when the token is valid and there are more users', async () => {
      await expect(getUsers({ accessToken, cloudId, startAt })).resolves.toStrictEqual({
        invalidUsers,
        validUsers,
        startAtNext: startAt + usersSyncBatchSize,
      });
    });
    test('should throw when the token is invalid', async () => {
      await expect(
        getUsers({ accessToken: 'invalid-token', cloudId, startAt })
      ).rejects.toBeInstanceOf(JiraError);
    });
    test('should throws when the cloudId is invalid', async () => {
      await expect(
        getUsers({ accessToken, cloudId: 'bad-cloud-id', startAt })
      ).rejects.toBeInstanceOf(JiraError);
    });
  });
});
