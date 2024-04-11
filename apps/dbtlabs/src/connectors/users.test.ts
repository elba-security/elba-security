/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { type DbtlabsUser, getUsers } from './users';
import { DbtlabsError } from './commons/error';

const nextCursor = '1';
const limit = 100;
const offset = 1;
const serviceToken = 'test-personal-token';
const accountId = '277209';
const accessUrl = 'https://example.us1.dbt.com';
const validUsers: DbtlabsUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: i,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  fullname: `fullname-${i}`,
  is_active: true,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${accessUrl}/api/v2/accounts/${accountId}/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${serviceToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('offset');
          let returnData;
          if (after) {
            returnData = {
              data: validUsers,
              extra: {
                filters: {
                  limit,
                  offset,
                },
                pagination: {
                  count: 1,
                  total_count: 200,
                },
              },
            };
          } else {
            returnData = {
              data: validUsers,
              extra: {
                filters: {
                  limit,
                  offset,
                },
                pagination: {
                  count: 1,
                  total_count: 2,
                },
              },
            };
          }
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ serviceToken, accountId, accessUrl, afterToken: nextCursor })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: (offset + limit).toString(),
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ serviceToken, accountId, accessUrl, afterToken: null })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          serviceToken: 'foo-id',
          accountId,
          accessUrl,
          afterToken: nextCursor,
        })
      ).rejects.toBeInstanceOf(DbtlabsError);
    });
  });
});
