import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { WebflowError } from '../commons/error';
import type { WebflowUser } from './users';
import { deleteUser, getUsers } from './users';

const validToken = 'valid-token';
const siteId = 'test-site-id';
const userId = 'test-user-id';
const maxUsers = 8;

const validUsers = ({
  length = 4,
  startFrom = 0,
}: {
  length?: number;
  startFrom?: number;
}): WebflowUser[] =>
  Array.from({ length }, (_, i) => ({
    id: `00000000-0000-0000-0000-00000000000${startFrom + i}`,
    status: 'active',
    data: {
      email: `user-email-${startFrom + i}@alpha.com`,
      name: `user-name-${startFrom + i}`,
    },
  }));

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        return new Response(
          JSON.stringify({
            users: validUsers({ startFrom: offset }),
            count: validUsers.length,
            limit: 3,
            offset,
            total: maxUsers,
          }),

          { status: 200 }
        );
      })
    );
  });

  test('should return users and nextPage when the token is valid and their is another page', async () => {
    await expect(
      getUsers({
        token: validToken,
        siteId,
        page: 0,
      })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers: [],
      nextPage: 0,
    });
  });

  test('should return users and no nextPage when the token is valid and their is no other page', async () => {
    await expect(
      getUsers({
        token: validToken,
        siteId,
        page: 0,
      })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers: [],
      nextPage: 0,
    });
  });

  test('should throw WebflowError when token is invalid', async () => {
    await expect(
      getUsers({
        token: 'invalid-token',
        siteId,
        page: 0,
      })
    ).rejects.toBeInstanceOf(WebflowError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users/${userId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return new Response(undefined, { status: 204 });
        }
      )
    );
  });

  test('should delete user successfully when token are valid', async () => {
    await expect(deleteUser(validToken, siteId, userId)).resolves.not.toThrow();
  });

  test('should throw WebflowError when token is invalid', async () => {
    await expect(deleteUser('invalidToken', siteId, userId)).rejects.toBeInstanceOf(WebflowError);
  });
});
