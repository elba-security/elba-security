import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '../env';
import { server } from '../../vitest/setup-msw-handlers';
import { type CalendlyUser, type Pagination, getOrganizationMembers, deleteUser } from './users';
import type { CalendlyError } from './commons/error';

const users: CalendlyUser[] = [
  {
    role: 'admin',
    uri: `user-uri`,
    user: {
      name: `username`,
      email: `user@gmail.com`,
    },
  },
];

const pagination: Pagination = {
  count: 10,
  next_page: 'next-cursor',
  next_page_token: 'next-token',
  previous_page: 'previous-cursor',
  previous_page_token: 'previous-token',
};

const validToken: string = env.CALENDLY_TOKEN;
const validDeleteUri =
  'https://api.calendly.com/organization_memberships/9382e519-fa14-4f7d-ae0d-4aecd2944d54';
const organizationUri = 'test-uri';

describe('getOrganizationMembers', () => {
  beforeEach(() => {
    server.use(
      http.get('https://api.calendly.com/organization_memberships', ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const pageToken = url.searchParams.get('page_token');
        const lastToken = 'last-token';
        const nextPageToken = 'next-token';
        const previousPageToken = 'previous-token';
        return new Response(
          JSON.stringify({
            collection: users,
            pagination: {
              ...pagination,
              next_page_token: pageToken === lastToken ? null : nextPageToken,
              previous_page_token: previousPageToken,
            },
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch organization members when token is valid', async () => {
    const result = await getOrganizationMembers(validToken, organizationUri, null);
    expect(result.collection).toEqual(users);
  });

  test('should throw CalendlyError when token is invalid', async () => {
    try {
      await getOrganizationMembers('invalidToken', organizationUri, null);
    } catch (error) {
      expect((error as CalendlyError).message).toEqual('Could not retrieve organization members');
    }
  });

  test('should return next_page_token as null when end of list is reached', async () => {
    const result = await getOrganizationMembers(validToken, organizationUri, 'last-token');
    expect(result.pagination.next_page_token).toBeNull();
  });

  test('should return next_page_token when there is next cursor', async () => {
    const result = await getOrganizationMembers(validToken, organizationUri, 'first-token');
    expect(result.pagination.next_page_token).toEqual('next-token');
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(validDeleteUri, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        return new Response(undefined, { status: 200 });
      })
    );
  });

  test('should delete user successfully when token and organization id are valid', async () => {
    await expect(deleteUser(validToken, validDeleteUri)).resolves.not.toThrow();
  });

  test('should throw calendlyError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', validDeleteUri);
    } catch (error) {
      expect((error as CalendlyError).message).toEqual(`Could not delete user: ${validDeleteUri}`);
    }
  });
});
