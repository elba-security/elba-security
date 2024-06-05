/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env/server';
import { MondayError } from '../common/error';
import type { MondayUser } from './users';
import { getUsers } from './users';

type RequestBody = {
  query: string;
};
const validToken = 'token-1234';
const endPage = 3;
const firstPage = 1;
const nextCursor = 2;

const validUsers: MondayUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `first_name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.post(env.MONDAY_API_BASE_URL, async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const body = (await request.json()) as RequestBody;
          const { query } = body;

          // Extract the page parameter using a regular expression
          const pageMatch = /page:\s*(?<pageNumber>\d+)/.exec(query);
          const page = pageMatch?.groups?.pageNumber
            ? parseInt(pageMatch.groups.pageNumber, 10)
            : undefined;

          return Response.json({
            data: {
              users: page !== endPage ? validUsers : [],
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: firstPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        validUsers: [],
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(MondayError);
    });
  });
});
