import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SendgridError } from './common/error';
import { type SendgridUser } from './users';
import { getUsers, deleteUser } from './users';

const userId = 'test-user-id';
const startOffset = 0;
const apiKey = 'test-api-key';

const validUsers: SendgridUser[] = Array.from(
  { length: env.SENDGRID_USERS_SYNC_BATCH_SIZE * 10 },
  (_, i) => ({
    username: `username-${i}`,
    email: `user-${i}@foo.bar`,
    first_name: `first_name-${i}`,
    last_name: `last_name-${i}`,
    user_type: 'teammate',
  })
);

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const offset = Number(url.searchParams.get('offset')) || 0;
        const limit = Number(url.searchParams.get('limit'));

        const isEndReached = offset + limit >= validUsers.length;

        let linkHeader = '';

        if (!isEndReached) {
          linkHeader += `<http://api.sendgrid.com/v3/resource?limit=${limit}&offset=${
            offset + limit
          }>; rel="next"; title="${1 + offset / limit}",`;
        }

        // prev
        linkHeader += `<http://api.sendgrid.com/v3/resource?limit=${limit}&offset=${Math.min(
          0,
          offset - limit
        )}>; rel="prev"; title="1",`;
        // last
        linkHeader += `<http://api.sendgrid.com/v3/resource?limit=${limit}&offset=${
          Math.floor(validUsers.length / limit) * limit
        }>; rel="last"; title="${Math.floor(validUsers.length / limit)}",`;
        // first
        linkHeader += `<http://api.sendgrid.com/v3/resource?limit=${limit}&offset=0>; rel="first"; title="1"`;

        return Response.json(
          {
            result: validUsers.slice(offset, offset + limit),
          },
          {
            headers: {
              Link: linkHeader,
            },
          }
        );
      };
      server.use(http.get(`${env.SENDGRID_API_BASE_URL}/v3/teammates`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another offset', async () => {
      await expect(getUsers({ apiKey, offset: startOffset })).resolves.toStrictEqual({
        validUsers: validUsers.slice(startOffset, startOffset + env.SENDGRID_USERS_SYNC_BATCH_SIZE),
        invalidUsers,
        nextPage: startOffset + env.SENDGRID_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other offset', async () => {
      const offset = validUsers.length - Math.floor(env.SENDGRID_USERS_SYNC_BATCH_SIZE / 2);
      await expect(getUsers({ apiKey, offset })).resolves.toStrictEqual({
        validUsers: validUsers.slice(offset, validUsers.length),
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          offset: 0,
        })
      ).rejects.toBeInstanceOf(SendgridError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.SENDGRID_API_BASE_URL}/v3/teammates/${userId}`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ apiKey, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey, userId })).resolves.toBeUndefined();
    });

    test('should throw SendgridError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalid-Api-Key', userId })).rejects.toBeInstanceOf(
        SendgridError
      );
    });
  });
});
