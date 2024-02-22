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
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import type { LinearUser } from './users';
import { getUsers } from './users';
import { LinearError } from './commons/error';

const validToken = 'token-1234';
const endCursor = 'end-cursor';
const nextCursor = 'next-cursor';

const validUsers: LinearUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  name: `name-${i}`,
  active: true,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [
  {
    id: `id-deactivated`,
  },
];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.LINEAR_API_BASE_URL}graphql`, async ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          // @ts-expect-error -- convenience
          const data: { variables: { afterCursor: string } } = await request.json();
          const { afterCursor } = data.variables;

          return Response.json({
            data: {
              users: {
                nodes: [...validUsers, ...invalidUsers],
                pageInfo: {
                  hasNextPage: afterCursor !== endCursor,
                  endCursor: afterCursor !== endCursor ? nextCursor : null,
                },
              },
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, afterCursor: 'start' })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken, afterCursor: endCursor })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar' })).rejects.toBeInstanceOf(LinearError);
    });
  });
});
