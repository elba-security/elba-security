/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type StatsigUser, getAllUsers } from './users';
import { StatsigError } from './commons/error';

const apiKey = 'test-api-key';
const validUsers: StatsigUser[] = Array.from({ length: 2 }, (_, i) => ({
  email: `user-${i}@foo.bar`,
  firstName: `first_name-${i}`,
  lastName: `last_name-${i}`,
  role: `owner`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getAllUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.STATSIG_API_BASE_URL}users`, ({ request }) => {
          if (request.headers.get('STATSIG-API-KEY') !== `${apiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const returnData = {
            data: validUsers,
          };

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid', async () => {
      await expect(getAllUsers({ apiKey })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getAllUsers({
          apiKey: 'foo-id',
        })
      ).rejects.toBeInstanceOf(StatsigError);
    });
  });
});
