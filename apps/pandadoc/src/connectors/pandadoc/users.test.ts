import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { PandadocError } from '../common/error';
import { type PandadocUser } from './users';
import { getUsers } from './users';

const startOffset = 0;
const apiKey = 'test-api-key';

const validUsers: PandadocUser[] = Array.from(
  { length: env.PANDADOC_USERS_SYNC_BATCH_SIZE * 10 },
  (_, i) => ({
    user_id: `user-id-${i}`,
    email: `user-${i}@foo.bar`,
    first_name: `first-name-${i}`,
    last_name: `last-name-${i}`,
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
        const page = Number(url.searchParams.get('page')) || 0;
        const limit = Number(url.searchParams.get('limit'));

        const isEndReached = page + limit >= validUsers.length;

        let linkHeader = '';

        if (!isEndReached) {
          linkHeader += `<http://api.pandadoc.com/v3/resource?limit=${limit}&page=${
            page + limit
          }>; rel="next"; title="${1 + page / limit}",`;
        }

        // prev
        linkHeader += `<http://api.pandadoc.com/v3/resource?limit=${limit}&page=${Math.min(
          0,
          page - limit
        )}>; rel="prev"; title="1",`;
        // last
        linkHeader += `<http://api.pandadoc.com/v3/resource?limit=${limit}&page=${
          Math.floor(validUsers.length / limit) * limit
        }>; rel="last"; title="${Math.floor(validUsers.length / limit)}",`;
        // first
        linkHeader += `<http://api.pandadoc.com/v3/resource?limit=${limit}&page=0>; rel="first"; title="1"`;

        return Response.json(
          {
            result: validUsers.slice(page, page + limit),
          },
          {
            headers: {
              Link: linkHeader,
            },
          }
        );
      };
      server.use(http.get(`${env.PANDADOC_API_BASE_URL}/v3/teammates`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: startOffset })).resolves.toStrictEqual({
        validUsers: validUsers.slice(startOffset, startOffset + env.PANDADOC_USERS_SYNC_BATCH_SIZE),
        invalidUsers,
        nextPage: startOffset + env.PANDADOC_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other page', async () => {
      const page = validUsers.length - Math.floor(env.PANDADOC_USERS_SYNC_BATCH_SIZE / 2);
      await expect(getUsers({ apiKey, page })).resolves.toStrictEqual({
        validUsers: validUsers.slice(page, validUsers.length),
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          page: 0,
        })
      ).rejects.toBeInstanceOf(PandadocError);
    });
  });
});
