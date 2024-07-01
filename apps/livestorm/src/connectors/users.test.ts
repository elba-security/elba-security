import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser, type LivestormUser } from './users';
import type { LivestormError } from './commons/error';
import { env } from '@/env';

const data: LivestormUser[] = [
  {
    id: 'user-id',
    attributes: {
      role: 'participant',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
    },
  },
];

const validToken = 'test-token';
const userId = 'test-id';
describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.LIVESTORM_API_BASE_URL}/users`, ({ request }) => {
        const url = new URL(request.url);
        if (request.headers.get('Authorization') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        const page = parseInt(url.searchParams.get('page[number]') || '0');
        const lastPage = 2;
        const nextPage = 1;
        const response = {
          data,
          meta: {
            next_page: page === lastPage ? null : nextPage,
          },
        };

        return new Response(JSON.stringify(response), {
          status: 200,
        });
      })
    );
  });

  test('should throw LivestormError when the token is invalid', async () => {
    try {
      await getUsers('invalidToken', 0);
    } catch (error) {
      expect((error as LivestormError).message).toEqual('Could not retrieve Livestorm users');
    }
  });
  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, 0);
    expect(result.data).toEqual(data);
  });

  test('should return next Page when there is another page', async () => {
    await expect(getUsers(validToken, 0)).resolves.toStrictEqual({
      data,
      meta: { next_page: 1 },
    });
  });

  test('should return no next Page when the end of list is reached', async () => {
    await expect(getUsers(validToken, 2)).resolves.toStrictEqual({
      data,
      meta: { next_page: null },
    });
  });
});
describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`${env.LIVESTORM_API_BASE_URL}/users/${userId}`, ({ request }) => {
        if (request.headers.get('Authorization') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(undefined, { status: 204 }); // Assuming a 204 No Content response for successful deletion
      })
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUser(validToken, userId)).resolves.not.toThrow();
  });

  test('should throw LivestormError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', userId);
    } catch (error) {
      expect((error as LivestormError).message).toEqual('Could not delete Livestorm user');
    }
  });
});
