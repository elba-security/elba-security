import { describe, test, expect, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import { users } from '@/inngest/functions/users/__mocks__/integration';
import { getUsers, deleteUser } from './users';
import { SentryError } from './commons/error';

const validToken = 'test-token';
const organizationSlug = 'test-organization';
const memberId = 'test-member-id';
describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(
        `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const lastCursor = 'last-cursor';
          const nextCursor = 'next-cursor';
          const requestCursor = url.searchParams.get('cursor');
          return new Response(JSON.stringify(users), {
            headers: {
              Link: `<https://example.com?cursor=${
                requestCursor === lastCursor ? null : nextCursor
              }>; rel="next"`,
            },
            status: 200,
          });
        }
      )
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, organizationSlug, null);
    expect(result.members).toEqual(users);
  });

  test('should throw SentryError when token is invalid', async () => {
    await expect(getUsers('invalidToken', organizationSlug, null)).rejects.toThrowError(
      SentryError
    );
  });

  test('should return nextCursor as null when end of list is reached', async () => {
    const result = await getUsers(validToken, organizationSlug, 'last-cursor');
    expect(result.pagination.nextCursor).toBeNull;
  });

  test('should return nextCursor when there is next cursor available', async () => {
    const result = await getUsers(validToken, organizationSlug, 'first-cursor');
    expect(result.pagination.nextCursor).toEqual('next-cursor');
  });
});
describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/${memberId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 204 }); // Assuming a 204 No Content response for successful deletion
        }
      )
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUser(validToken, organizationSlug, memberId)).resolves.not.toThrow();
  });

  test('should throw SentryError when token is invalid', async () => {
    await expect(deleteUser('invalidToken', organizationSlug, memberId)).rejects.toThrow(
      SentryError
    );
  });
});
