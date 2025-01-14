import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BrevoError } from '../common/error';
import { type BrevoUser, getUsers } from './users';

const validApiKey = 'test-api-key';
const invalidApiKey = 'foo-bar';
const totalPage = 15;

const validNextPageUsers: BrevoUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  status: `active`,
  email: `user-${i}@foo.bar`,
  is_owner: false,
}));

const invalidUsers = [];

describe('getBrevoUsers', () => {
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
    server.use(http.get(`${env.BREVO_API_BASE_URL}/v1/users/search`, resolver));
  });

  test('should return users and nextPage when the apiKey is valid and their is another page', async () => {
    await expect(getUsers(validApiKey)).resolves.toStrictEqual({
      validUsers: validNextPageUsers,
      invalidUsers,
    });
  });

  test('should return users and no nextPage when the apiKey is valid and their is no other page', async () => {
    await expect(getUsers(validApiKey)).resolves.toStrictEqual({
      validUsers: [],
      invalidUsers,
    });
  });

  test('should throws when the api key is invalid', async () => {
    await expect(getUsers(invalidApiKey)).rejects.toBeInstanceOf(BrevoError);
  });
});
