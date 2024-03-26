import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser, type ApolloUser, type Pagination } from './users';
import { ApolloError } from './commons/error';

const users: ApolloUser[] = [
  {
    id: 'user-id',
    name: 'Username',
    email: 'user@gmail.com',
  },
];

const pagination: Pagination = {
  page: '1',
  per_page: 10,
  total_entries: 2,
  total_pages: 1,
};

const validToken = 'test-token';
const userId = 'test-id';
const maxPage = '2';
describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.apollo.io/v1/users/search', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('api_key') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        const page = url.searchParams.get('page') || '0';
        const response = {
          users: parseInt(page) > pagination.total_pages ? [] : users,
          pagination: { ...pagination, page },
        };
        return new Response(JSON.stringify(response), {
          status: 200,
        });
      })
    );
  });

  test('should throw ApolloError when the token is invalid', async () => {
    try {
      await getUsers('invalidToken', '0');
    } catch (error) {
      expect(error instanceof ApolloError).toBeTruthy();
      expect(error.message).toEqual('Could not retrieve users');
    }
  });
  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, '0');
    expect(result.users).toEqual(users);
  });

  test('should return users when there is another page', async () => {
    await expect(getUsers(validToken, '0')).resolves.toStrictEqual({
      users,
      pagination: { ...pagination, page: '0' },
    });
  });

  test('should return no users when there is no other page', async () => {
    await expect(getUsers(validToken, maxPage)).resolves.toStrictEqual({
      users: [],
      pagination: { ...pagination, page: maxPage },
    });
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    // Mock the DELETE request to the Apollo API endpoint
    server.use(
      http.delete<{ userId: string }>(`https://api.apollo.io/v1/users/:userId`, ({ request, params }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('api_key') !== validToken) {
          return new Response(undefined, { status: 401 }); 
        }
        if (params.userId !== userId) {
           return new Response(undefined, { status: 404 }); 
        }
        return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when API key is valid', async () => {
    await expect(deleteUser(validToken, userId)).resolves.not.toThrow();
  });

  test('should throw error when API key is invalid', async () => {
    try {
      await deleteUser('invalidToken', userId);
    } catch (error) {
      expect((error as ApolloError).message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
  test('should throw error when API key is invalid', async () => {
    try {
      await deleteUser('invalidToken', userId); 
    } catch (error) {
      expect((error as ApolloError).message).toEqual(`Could not delete user with Id: ${userId}`); 
    }
  });
});

