/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type DopplerUser, getUsers } from './users';
import { DopplerError } from './commons/error';

const nextCursor = '1';
const page = 1;
const apiKey = 'test-api-key';
const validUsers: DopplerUser[] = Array.from({ length: 2 }, (_, i) => ({
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
      server.use(http.get(`${env.DOPPLER_API_BASE_URL}workplace/users`, resolver));
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: (page + 1).toString(),
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, page: null })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({
          apiKey: 'foo-id',
          page: nextCursor,
        })
      ).rejects.toBeInstanceOf(DopplerError);
    });
  });
});
