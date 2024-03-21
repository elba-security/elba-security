
import { describe, test, expect, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, type SentryUser, type Pagination } from './users';
import { SentryError } from './commons/error';

const validToken = 'test-token';
const organizationSlug = 'test-organization';
const cursor = 'test-cursor';

const sentryUsers: SentryUser[] = [
  {
    role: 'admin',
    user: {
      id: 'user-id',
      name: 'Username',
      email: 'user@gmail.com',
    },
  },
];

const pagination: Pagination = {
  nextCursor: 'next-test-cursor',
};

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://sentry.io/api/0/organizations/${organizationSlug}/members/`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url); 
        if (url.searchParams.get('cursor') !== cursor) {
          return new Response(
            JSON.stringify(sentryUsers),
            { headers: { Link: '<https://example.com>; rel="next"' }, status: 200 }
          );
        }

        return new Response(
          JSON.stringify(sentryUsers),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers(validToken, organizationSlug, null);
    expect(result.members).toEqual(sentryUsers);
  });

  test('should throw SentryError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', organizationSlug, null);
    } catch (error) {
      expect((error as SentryError).message).toEqual('Could not retrieve Sentry organization members');
    }
  });

  test('should return nextCursor as null when end of list is reached', async () => {
    const result = await getUsers(validToken, organizationSlug, cursor);
    expect(result.pagination.nextCursor).toBeNull();
  });

  test('should return nextCursor when there is next cursor available', async () => {
    const result = await getUsers(validToken, organizationSlug, 'first-cursor');
    expect(result.pagination.nextCursor).toEqual('next-cursor');
  });
});