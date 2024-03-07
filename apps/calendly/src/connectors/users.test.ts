/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `auth` connectors function.
 * Theses tests exists because the services & inngest functions using this connector mock it.
 * If you are using an SDK we suggest you to mock it not to implements calls using msw.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '../env';
import { server } from '../../vitest/setup-msw-handlers';
import { type CalendlyUser, type Pagination, getOrganizationMembers, deleteUser } from './users'; 
import type { CalendlyError } from './commons/error';

const users: CalendlyUser[] = [
  {
    uri: `https://api.calendly.com/users/886e3726-320a-4ce7-8e53-d3d5e1ca537b`,
    name: `Ahmed Hashir`,
    email: `ahmedhashir471@gmail.com`,
  },
];

const pagination: Pagination = {
  next_page: 'next-cursor',
  next_page_token: 'next-token',
  previous_page: 'previous-cursor',
  previous_page_token: 'previous-token',
};

const validToken: string = env.CALENDLY_TOKEN as string;
const userId = 'test-user-id';


describe('getOrganizationMembers', () => { 
  beforeEach(() => {
    server.use(
      http.get('https://api.calendly.com/organization_memberships', ({ request }) => { 
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const pageToken = url.searchParams.get('page_token');
        const nextPageToken = 'next-token';
        const previousPageToken = 'previous-token';
        return new Response(
          JSON.stringify({
            members: users,
            nextPage: {
              ...pagination,
              next_page_token: pageToken === nextPageToken ? null : nextPageToken,
              previous_page_token: previousPageToken,
            },
          }),
          { status: 200 }
        );
      })
    );
  });

  test('should fetch organization members when token is valid', async () => {
    const result = await getOrganizationMembers(validToken, null);
    expect(result.members).toEqual(users);
  });

  test('should throw CalendlyError when token is invalid', async () => {
    try {
      await getOrganizationMembers('invalidToken', null);
    } catch (error) {
      const calendlyError = error as CalendlyError;
      expect(calendlyError.message).toEqual('Could not retrieve organization members');
    }
  });

  test('should return next_page_token as null when end of list is reached', async () => {
    const result = await getOrganizationMembers(validToken, 'last-token');
    expect(result.nextPage.next_page_token).toBeNull();
  });

  test('should return next_page_token when there is next cursor', async () => {
    const result = await getOrganizationMembers(validToken, 'first-token');
    expect(result.nextPage.next_page_token).toEqual('next-token');
 });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete(
        `https://api.calendly.com/organization_memberships/${userId}`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token and organization id are valid', async () => {
    await expect(deleteUser(validToken, userId)).resolves.not.toThrow();
  });

  test('should throw calendlyError when token is invalid', async () => {
    try {
      await deleteUser('invalidToken', userId);
    } catch (error) {
      const calendlyError = error as CalendlyError;
      expect(calendlyError.message).toEqual(`Could not delete user with Id: ${userId}`);
    }
  });
});

