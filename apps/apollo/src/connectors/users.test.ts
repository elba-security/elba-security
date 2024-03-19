import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser,type ApolloUser, type Pagination } from './users';
import  { ApolloError } from './commons/error';

const users: ApolloUser[] = [
  {
    id: 'user-id',
    name: 'Username',
    email: 'user@gmail.com',
  },
];

const pagination: Pagination = {
  page: "1",
  per_page: 10,
  total_entries: 2,
  total_pages: 1,
};

const validToken = 'test-token';
const userId= "test-id";
const maxPage = "2"; 
describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.apollo.io/v1/users/search', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('api_key') !== validToken) {
          return new Response(undefined, { status: 401 });
        }
        const page = parseInt(url.searchParams.get('page') || "0");
        const response = {
          users: page >= pagination.total_pages ? [] : users,
          pagination: { ...pagination, page: String(page) }
        };
        return new Response(JSON.stringify(response), {
          status: 200
        });
      })
    );
  });

  test('should return users and nextPage when the token is valid and there is another page', async () => {
    await expect(getUsers(validToken, "0")).resolves.toStrictEqual({
      users,
      pagination: { ...pagination, page: "0" },
    });
  });

  test('should return users and no nextPage when the token is valid and there is no other page', async () => {
    await expect(getUsers(validToken, maxPage)).resolves.toStrictEqual({
      users,
      pagination: { ...pagination, page: maxPage }, 
    });
  });
  test('should throw ApolloError when the token is invalid', async () => {
    await expect(getUsers('invalidToken', "0")).rejects.toBeInstanceOf(ApolloError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    // Mock the DELETE request to the Apollo API endpoint
    server.use(
      http.delete(`https://api.apollo.io/v1/users/${userId}/?api_key=${validToken}`, ({ request }) => {
        // Check if the API key matches
        if (request.url.includes(`api_key=${validToken}`)) {
          return new Response(undefined, { status: 200 }); // Success status
        } else {
          return new Response(undefined, { status: 401 }); // Unauthorized status
        }
      })
    );
  });

  test('should delete user successfully when API key is valid', async () => {
    await expect(deleteUser(validToken, userId)).resolves.not.toThrow(); 
  });

  test('should throw error when API key is invalid', async () => {
    try {
      await deleteUser('invalidToken', userId); 
    } catch (error) {
      expect((error as ApolloError).message).toEqual(`Could not delete user with Id: ${userId}`); // Expect error message
    }
  });
});
