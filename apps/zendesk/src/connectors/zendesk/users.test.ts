 

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ZendeskError } from '../common/error';
import type { ZendeskUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const endPage = '3';
const nextPageLink = 'next-page-link';

const validUsers: ZendeskUser[] = Array.from({ length: 5 }, (_, i) => ({
  data: {
    id: i,
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    status: 'active',
    role: 'admin',
  },
  meta: {
    type: 'user',
  },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.ZENDESK_API_BASE_URL}/v2/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          const responseData = {
            items: validUsers,
            meta: {
              links: page === endPage ? {} : { next_page: nextPageLink },
            },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, page: nextPageLink })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageLink,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(ZendeskError);
    });
  });
});
