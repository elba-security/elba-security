 
 

import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { SendgridError } from '../commons/error';
import { type SendgridUser, getUsers } from './users';

const nextCursor = '1';
const offset = 1;
const apiKey = 'test-api-key';
const validUsers: SendgridUser[] = Array.from({ length: 2 }, (_, i) => ({
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
        const after = url.searchParams.get('offset');

        const returnData = {
          workplace_users: after ? validUsers : [],
          offset,
        };

        return Response.json(returnData);
      };
      server.use(http.get(`${env.SENDGRID_API_BASE_URL}/v3/workplace/users`, resolver));
    });

    test('should return users and nextPage when the key is valid and their is another offset', async () => {
      await expect(getUsers({ apiKey, offset: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: (offset + 1).toString(),
      });
    });

    test('should return users and no nextPage when the key is valid and their is no other offset', async () => {
      await expect(getUsers({ apiKey, offset: null })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the key is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          offset: nextCursor,
        })
      ).rejects.toBeInstanceOf(SendgridError);
    });
  });
});
