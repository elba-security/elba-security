/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type JumpcloudUser, getUsers } from './users';
import { JumpcloudError } from './commons/error';

const nextCursor = 'test-next-cursor';
const validApiKey = 'test-access-id';

const validUsers: JumpcloudUser[] = Array.from({ length: 5 }, (_, i) => ({
  _id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  firstname: `firstname-${i}`,
  lastname: `lastname-${i}`,
  suspended: false,
  enableMultiFactor: false,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getJumpcloudUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.JUMPCLOUD_API_BASE_URL}users`, ({ request }) => {
        if (request.headers.get('x-api-key') !== `${validApiKey}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const after = url.searchParams.get('skip');
        let returnData;
        if (after) {
          returnData = {
            results: validUsers,
            skip: nextCursor,
          };
        } else {
          returnData = {
            results: validUsers,
          };
        }
        return Response.json(returnData);
      })
    );
  });

  test('should return users and nextPage when the apiKey is valid and their is another page', async () => {
    await expect(getUsers({ apiKey: validApiKey, after: nextCursor })).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextCursor,
    });
  });

  test('should return users and no nextPage when the apiKey is valid and their is no other page', async () => {
    await expect(getUsers({ apiKey: validApiKey, after: null })).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getUsers({ apiKey: 'foo-id', after: nextCursor })
    ).rejects.toBeInstanceOf(JumpcloudError);
  });
});
