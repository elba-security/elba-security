import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { env } from '../env';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, deleteUser, type VercelUser, type Pagination } from './users';
import type { VercelError } from './commons/error';

const users: VercelUser[] = [
  {
    role: 'admin',
    uid: 'user-uid',
    name: 'username',
    email: 'user@gmail.com',
  },
];

const pagination: Pagination = {
  count: 10,
  next: 'next-value',
  prev: 'previous-value',
  hasNext: true,
};

const validToken='test-token';
const teamId = 'test-team-id';
const userId = "test-user-id";

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://api.vercel.com/v2/teams/${teamId}/members`, ({ request,params }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        if (params.teamId !== teamId)
        {
          return new Response(undefined, { status: 404 });
        }

        const url = new URL(request.url);
        const page = url.searchParams.get('until');

        return new Response(
          JSON.stringify({
            members: users,
            pagination: {
              ...pagination,
              next: page === 'next-page' ? 'next-page' : null,
              prev: "previous-value",

            },
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch team members when token is valid', async () => {
    const result = await getUsers(validToken, teamId, null);
    expect(result.members).toEqual(users);
  });

  test('should throw VercelError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', teamId, null);
    } catch (error) {
      expect((error as VercelError).message).toEqual('Could not retrieve team members');
    }
  });

  test('should return next page when there is next page', async () => {
    const result = await getUsers(validToken, teamId, 'next-page');
    expect(result.pagination.next).toEqual('next-page');
  });
  
  test('should return next as null when there are no more pages', async () => {
    const result = await getUsers(validToken, teamId, null);
    expect(result.pagination.next).toBeNull();
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(`https://api.vercel.com/v2/teams/${teamId}/members/${userId}`, ({ request,params }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        if (params.teamId !== teamId)
        {
          return new Response(undefined, { status: 404 });
        }
        return new Response(undefined, { status: 200 });
      })
    );
  });

  test('should delete User successfully when token and team id are valid', async () => {
    await expect(deleteUser(validToken, teamId, userId)).resolves.not.toThrow();
  });

  test('should throw VercelError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', teamId, userId);
    } catch (error) {
      const vercelError = error as VercelError;
      expect(vercelError.message).toEqual(`Could not delete team member with Id: ${userId}`);
    }
  });
});
