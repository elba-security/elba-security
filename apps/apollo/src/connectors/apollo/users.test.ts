import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { ApolloError } from '../common/error';
import { type ApolloUser, getUsers } from './users';

const nextPage = 1;
const validApiKey = 'test-api-key';
const totalPage = 15;
const endPage = 16;

const validNextPageUsers: ApolloUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  deleted: false,
}));

const invalidUsers = [];

describe('getApolloUsers', () => {
  beforeEach(() => {
    const resolver: ResponseResolver = ({ request }) => {
      if (request.headers.get('X-Api-Key') !== validApiKey) {
        return new Response(undefined, { status: 401 });
      }

      const urlObj = new URL(request.url);
      const page = urlObj.searchParams.get('page') || '1';

      const returnData =
        totalPage < parseInt(page, 10)
          ? {
              users: [],
              pagination: {
                page,
                total_pages: totalPage,
              },
            }
          : {
              users: validNextPageUsers,
              pagination: {
                page,
                total_pages: totalPage,
              },
            };

      return Response.json(returnData);
    };
    server.use(http.get(`${env.APOLLO_API_BASE_URL}/v1/users/search`, resolver));
  });

  test('should return users and nextPage when the apiKey is valid and their is another page', async () => {
    await expect(getUsers({ apiKey: validApiKey, after: nextPage })).resolves.toStrictEqual({
      validUsers: validNextPageUsers,
      invalidUsers,
      nextPage: nextPage + 1,
    });
  });

  test('should return users and no nextPage when the apiKey is valid and their is no other page', async () => {
    await expect(getUsers({ apiKey: validApiKey, after: endPage })).resolves.toStrictEqual({
      validUsers: [],
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the api key is invalid', async () => {
    await expect(getUsers({ apiKey: 'foo-id', after: 0 })).rejects.toBeInstanceOf(ApolloError);
  });
});
