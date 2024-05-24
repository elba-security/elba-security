import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '@elba-security/test-utils';
import { getUsers, type MakeUser } from './users';
import { MakeError } from './commons/error';
import { env } from '../env';
import { users } from '../inngest/functions/users/__mocks__/integration';

const validToken = 'test-token';
const teamId = 'team-id';
const nextOffset = 10;
const lastOffset = 20;

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MAKE_API_BASE_URL}/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Token ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const offset = parseInt(url.searchParams.get('pg[offset]') || '0');
        const limit = parseInt(url.searchParams.get('pg[limit]') || '0');
        return new Response(
          JSON.stringify({
            users: offset === lastOffset ? [] : users,
            pg: { limit, offset },
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, teamId, null);
    expect(result.users).toEqual(users);
  });

  test('should throw MakeError when token is invalid', async () => {
    await expect(getUsers('invalidToken', teamId, null)).rejects.toThrow(
      MakeError
    );
  });

  test('should return next offset when there is next offset', async () => {
    const result = await getUsers(validToken, teamId, 0);
    expect(result.pagination.next).toEqual(nextOffset);
  });

  test('should return next as null when there are no more pages', async () => {
    const result = await getUsers(validToken, teamId, lastOffset);
    expect(result.pagination.next).toBeNull();
  });
});
