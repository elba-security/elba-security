/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type YousignUser, getUsers } from './users';
import { YousignError } from './commons/error';

const validToken = 'valid-api-key';
const nextCursor = 'test-next-cursor'

const validUsers: YousignUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  first_name: `firstName-${i}`,
  last_name: `lastName-${i}`,
  is_active: true,
  role: 'owner',
  phone_number: `12345-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getYousignUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.YOUSIGN_API_BASE_URL}v3/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('after');
        let returnData;
        if (after) {
          returnData = {
            data: validUsers,
            meta: {
              next_cursor: nextCursor,
            },
          };
        } else {
          returnData = {
            data: validUsers,
            meta: {
              next_cursor: null,
            },
          };
        }
        return Response.json(returnData);
      })
    );
  });

  test('should return users and nextPage when the token is valid and their is another page', async () => {
    await expect(
      getUsers({ token: validToken, after: nextCursor })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextCursor
    });
  });

  test('should return users and no nextPage when the token is valid and their is no other page', async () => {
    await expect(
      getUsers({ token: validToken, after: null })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getUsers({ token: 'foo-bar', after: nextCursor })
    ).rejects.toBeInstanceOf(YousignError);
  });
});

