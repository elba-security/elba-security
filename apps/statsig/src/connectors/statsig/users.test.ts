import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { StatsigError } from '../commons/error';
import { type StatsigUser, getUsers } from './users';

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
      server.use(
        http.get(`${env.STATSIG_API_BASE_URL}/users`, ({ request }) => {
          if (request.headers.get('Statsig-Api-Key') !== String(apiKey)) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: validUsers,
          });
        })
      );
    });

    test('should return all the users in one page', async () => {
      await expect(getUsers({ apiKey })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
        })
      ).rejects.toBeInstanceOf(StatsigError);
    });
  });
});
