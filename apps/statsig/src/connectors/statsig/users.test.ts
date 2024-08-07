import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { StatsigError } from '../common/error';
import { type StatsigUser, getUsers } from './users';

const nextPage = '/console/v1/users?page=2';
const apiKey = 'test-api-key';
const validUsers: StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  role: 'member',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('STATSIG-API-KEY') !== apiKey) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('page');

        const returnData = {
          data: validUsers,
          pagination: {
            nextPage: after ? nextPage : null,
          },
        };

        return Response.json(returnData);
      };
      server.use(http.get(`${env.STATSIG_API_BASE_URL}/console/v1/users`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, page: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          page: nextPage,
        })
      ).rejects.toBeInstanceOf(StatsigError);
    });
  });
});
