import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { StatsigError } from '../commons/error';
import { type StatsigUser, getAllUsers } from './users';

const apiKey = 'test-api-key';
const validUsers: StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  role: 'member',
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getAllUsers', () => {
    beforeEach(() => {
      const resolver: ResponseResolver = ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${apiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const returnData = {
          data: validUsers,
        };
        return Response.json(returnData);
      };
      server.use(http.get(`${env.STATSIG_API_BASE_URL}users`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another page', async () => {
      await expect(getAllUsers({ apiKey })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other page', async () => {
      await expect(getAllUsers({ apiKey })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getAllUsers({
          apiKey: 'foo-id',
        })
      ).rejects.toBeInstanceOf(StatsigError);
    });
  });
});
