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
import type { PagerdutyUser } from './users';
import { getUsers, deleteUsers } from './users';
import { PagerdutyError } from './commons/error';

const validToken = 'token-1234';
const nextPage = '1';
const userId = 'test-id';
const validUsers: PagerdutyUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `userName-${i}`,
  role: 'owner',
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.PAGERDUTY_API_BASE_URL}users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const offset = url.searchParams.get('offset');
          let returnData;
          if (offset) {
            returnData = {
              users: validUsers,
              offset: 1,
              more: true,
            };
          } else {
            returnData = {
              users: validUsers,
              offset: 0,
              more: false,
            };
          }
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(nextPage, 10) + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken, nextPage: '' })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar' })).rejects.toBeInstanceOf(PagerdutyError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(`${env.PAGERDUTY_API_BASE_URL}users/${userId}`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.userId !== userId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        })
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUsers({ token: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUsers({ token: validToken, userId })).resolves.toBeUndefined();
    })
    
    test('should throw PagerdutyError when token is invalid', async () => {
        await expect(deleteUsers({ token: 'invalidToken', userId })).rejects.toBeInstanceOf(PagerdutyError);
    });
  });
});
