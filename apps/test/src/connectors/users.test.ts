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
import { server } from '../../vitest/setup-msw-handlers';
import { type MySaasUser, getUsers } from './users';
import { MySaasError } from './commons/error';

const validToken = 'token-1234';
const maxPage = 3;

const users: MySaasUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  email: `user-${i}@foo.bar`,
}));

describe('auth connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get('https://mysaas.com/api/v1/users', ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const pageParam = url.searchParams.get('page');
          const page = pageParam ? Number(pageParam) : 0;
          if (page === maxPage) {
            return Response.json({ nextPage: null, users });
          }
          return Response.json({ nextPage: page + 1, users });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validToken, 0)).resolves.toStrictEqual({
        users,
        nextPage: 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validToken, maxPage)).resolves.toStrictEqual({
        users,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('foo-bar', 0)).rejects.toBeInstanceOf(MySaasError);
    });
  });
});
