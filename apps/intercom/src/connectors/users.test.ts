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
import type { IntercomUser } from './users';
import { getUsers } from './users';
import { IntercomError } from './commons/error';

const validToken = 'token-1234';
const nextCursor = 'next-cursor';

const validUsers: IntercomUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.INTERCOM_API_BASE_URL}/admins`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const startingAfter  = url.searchParams.get('starting_after');
          let returnData;
          if(startingAfter) {
            returnData = {
              pages: {
                page: 3,
                per_page: 20,
                next: {
                  starting_after: nextCursor
                }
              },
              admins: validUsers
            }
          } else {
            returnData = {
              admins: validUsers
            }
          }
          console.log("returnData:",returnData)

          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, next: 'start' })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextCursor,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: undefined,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar' })).rejects.toBeInstanceOf(IntercomError);
    });
  });
});
