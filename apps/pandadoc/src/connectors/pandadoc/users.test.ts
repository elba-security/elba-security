import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { PandadocError } from '../common/error';
import { type PandadocUser } from './users';
import { getUsers } from './users';

const apiKey = 'test-api-key';
const nextPage = 1;
const endPage = 2;

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
        if (request.headers.get('Authorization') !== `API-Key ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const page = url.searchParams.get('page') || '1';
        const responseData = {
          results: page === String(endPage) ? [] : validUsers,
        };
        return Response.json(responseData);
      };
      server.use(http.get(`${env.PANDADOC_API_BASE_URL}/public/v1/users`, resolver));
    });
    test('should return users and nextPage when the key is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPage + 1,
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, page: endPage })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          page: 1,
        })
      ).rejects.toBeInstanceOf(PandadocError);
    });
  });
});
