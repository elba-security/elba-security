import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { CheckrError } from '../common/error';
import { type CheckrUser, getUsers } from './users';

const nextCursor = `${env.CHECKR_API_BASE_URL}/v1/users?per_page=1&page=2`;
const endPage = '3';
const apiKey = 'test-api-key';
const endPageUrl = `${env.CHECKR_API_BASE_URL}/v1/users?per_page=1&page=${endPage}`;
const validUsers: CheckrUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `${i}`,
  full_name: `fullname-${i}`,
  email: `user-${i}@foo.bar`,
  roles: [
    {
      name: 'admin',
    },
  ],
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.CHECKR_API_BASE_URL}/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Basic ${btoa(`${apiKey}:`)}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('page') || '1';
          const returnData = {
            data: validUsers,
            next_href: after === endPage ? null : nextCursor,
          };
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ apiKey, page: nextCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ apiKey, page: endPageUrl })).resolves.toStrictEqual({
        validUsers,
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
      ).rejects.toBeInstanceOf(CheckrError);
    });
  });
});
