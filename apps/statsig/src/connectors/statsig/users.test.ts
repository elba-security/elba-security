 
 

import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { StatsigError } from '../commons/error';
import { type StatsigUser, getUsers } from './users';

const nextCursor = '1';
const page = 1;
const apiKey = 'test-api-key';
const validUsers: StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  access: `owner`,
  user: {
    name: `username-${i}`,
    email: `user-${i}@foo.bar`,
  },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('page');

        const returnData = {
          workplace_users: after ? validUsers : [],
          page,
        };

        return Response.json(returnData);
      };
      server.use(http.get(`${env.STATSIG_API_BASE_URL}/v3/workplace/users`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: (page + 1).toString(),
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, page: null })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          page: nextCursor,
        })
      ).rejects.toBeInstanceOf(StatsigError);
    });
  });
});
