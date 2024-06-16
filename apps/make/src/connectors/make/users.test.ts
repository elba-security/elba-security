import { describe, expect, test, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '@elba-security/test-utils';
import { MakeError } from '../commons/error';
import { users } from '../../inngest/functions/users/__mocks__/integration';
import { getUsers } from './users';

const zoneDomain = 'eu2.make.com';
const validToken = 'test-token';
const organizationId = 'organization-id';
const nextOffset = 10;
const lastOffset = 20;

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${zoneDomain}/api/v2/users`, ({ request }) => {
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
    const result = await getUsers(validToken, organizationId, null, zoneDomain);
    expect(result.users).toEqual(users);
  });

  test('should throw MakeError when token is invalid', async () => {
    await expect(getUsers('invalidToken', organizationId, null, zoneDomain)).rejects.toThrow(
      MakeError
    );
  });

  test('should return next offset when there is next offset', async () => {
    const result = await getUsers(validToken, organizationId, 0, zoneDomain);
    expect(result.pagination.next).toEqual(nextOffset);
  });

  test('should return next as null when there are no more pages', async () => {
    const result = await getUsers(validToken, organizationId, lastOffset, zoneDomain);
    expect(result.pagination.next).toBeNull();
  });
});
