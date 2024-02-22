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
import { getUsers } from './users';
import { LinearError } from './commons/error';
import { LinearUser } from '@/inngest/functions/users/synchronize-users';

const validToken = 'token-1234';
const page = "some page";

const mockUsers = [
  { id: '1', username: 'user1', name: 'User One', email: 'user1@example.com' },
  { id: '2', username: 'user2', name: 'User Two', email: 'user2@example.com' },
];
const pageInfo = {
  hasNextPage: true,
  endCursor: 'end-cursor-token',
};

const users: LinearUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  email: `user-${i}@foo.bar`,
}));

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(`${env.LINEAR_API_BASE_URL}graphql`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            data: {
              users: {
                nodes: mockUsers,
                pageInfo: {
                  hasNextPage: false,
                  endCursor: page,
                },
              },
            },
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({token:validToken, afterCursor: page})).resolves.toStrictEqual({
        data: mockUsers,
        paging: {
          next: null
        },
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({token: validToken, afterCursor: null})).resolves.toStrictEqual({
        data: mockUsers,
        paging: {
          next: null
        },
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({token: 'foo-bar'})).rejects.toBeInstanceOf(LinearError);
    });
  });
});
