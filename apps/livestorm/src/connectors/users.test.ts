import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser, type LivestormUser, type Pagination } from './users';
import { LivestormError } from './commons/error';

const users: LivestormUser[] = [
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

const pagination: Pagination = {
  current_page: 1,
  previous_page: null,
  next_page: null,
  record_count: 1,
  page_count: 1,
  items_per_page: 10,
};

const validToken = 'test-token';
const userId = 'test-id';
const maxPage = 2;
describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.livestorm.co/v1/users', ({ request }) => {
        const url = new URL(request.url);
        if (request.headers.get('Authorization') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        const page = parseInt(url.searchParams.get('page[number]') || '0');
        const response = {
          users: page > pagination.page_count ? [] : users,
          pagination: { ...pagination, current_page: page },
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
      expect(error instanceof LivestormError).toBeTruthy();
      expect(error.message).toEqual('Could not retrieve Livestorm users');
    }
  });
  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, 0);
    expect(result.users).toEqual(users);
  });

  test('should return users when there is another page', async () => {
    await expect(getUsers(validToken, 0)).resolves.toStrictEqual({
      users,
      pagination: { ...pagination, current_page: 0 },
    });
  });

  test('should return no users when there is no other page', async () => {
    await expect(getUsers(validToken, maxPage)).resolves.toStrictEqual({
      users: [],
      pagination: { ...pagination, current_page: maxPage },
    });
  });
});
describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`https://api.livestorm.co/v1/users/${userId}`, ({ request }) => {
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
      expect(error instanceof LivestormError).toBe(true);
      expect(error.message).toEqual('Could not delete Livestorm user');
    }
  });
});
