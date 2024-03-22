/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { describe, test, expect, beforeEach } from 'vitest';
import { http } from 'msw';
import { server } from '../../vitest/setup-msw-handlers';
import { getUsers, type SentryUser, type Pagination, deleteUser } from './users';
import { SentryError } from './commons/error';

const validToken = 'test-token';
const sourceOrganizationId = 'test-organization';
const cursor = 'test-cursor';
const memberId= "test-member-id";

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
      http.get(`https://sentry.io/api/0/organizations/${sourceOrganizationId}/members/`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url); 
        const lastCursor = 'last-cursor';
        const nextCursor = 'next-cursor';
        const requestCursor = url.searchParams.get('cursor');

        if (requestCursor !== lastCursor) {
          return new Response(
            JSON.stringify(sentryUsers),
            { headers: { Link: `<https://example.com?cursor=${nextCursor}>; rel="next"` }, status: 200 }
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
    const result = await getUsers(validToken, sourceOrganizationId, null);
    expect(result.members).toEqual(sentryUsers);
  });

  test('should throw SentryError when token is invalid', async () => {
    try {
      await getUsers('invalidToken', sourceOrganizationId, null);
    } catch (error) {
      expect((error as SentryError).message).toEqual('Could not retrieve Sentry organization members');
    }
  });

  test('should return nextCursor as null when end of list is reached', async () => {
    const result = await getUsers(validToken, sourceOrganizationId, "last-cursor");
    expect(result.pagination.nextCursor).toBeNull();
  });

  test('should return nextCursor when there is next cursor available', async () => {
    const result = await getUsers(validToken, sourceOrganizationId, 'first-cursor');
    expect(result.pagination.nextCursor).toEqual('next-cursor');
  });
});
describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `https://api.sentry.io/api/0/organizations/${sourceOrganizationId}/members/${memberId}`,
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
    await expect(deleteUser(validToken, sourceOrganizationId, memberId)).resolves.not.toThrow();
  });

  test('should throw SentryError when token is invalid', async () => {
    try {
      await deleteUser("invalidToken", sourceOrganizationId, memberId);
    } catch (error) {
      expect(error instanceof SentryError).toBe(true);
      expect(error.message).toEqual('Could not delete Sentry user');
    }
  });
});