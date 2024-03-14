import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { env } from '../env';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, type VercelUser, type Pagination } from './users';
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

const validToken: string = env.VERCEL_TOKEN;
const teamId = 'test-team-id';

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://api.vercel.com/v2/teams/${teamId}/members`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }

        const url = new URL(request.url);
        const nextPage = url.searchParams.get('until');

        return new Response(
          JSON.stringify({
            members: users,
            pagination: {
              ...pagination,
              next: nextPage === 'next-page' ? null : nextPage,
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
    expect(result.pagination.next).toBeNull();
  });
  
  test('should return next as null when there are no more pages', async () => {
    const result = await getUsers(validToken, teamId, null);
    expect(result.pagination.next).toEqual(2);
  });
});
