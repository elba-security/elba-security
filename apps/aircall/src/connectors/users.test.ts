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
import type { AircallUser } from './users';
import { getUsers } from './users';
import { AircallError } from './commons/error';

const validToken = 'token-1234';
const nextPageLink = `${env.AIRCALL_API_BASE_URL}v1/users?page=2`;

const validUsers: AircallUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  availability_status: 'available',
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.AIRCALL_API_BASE_URL}v1/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const page = url.searchParams.get('page');
          let returnData;
          if (page) {
            returnData = {
              users: validUsers,
              meta: {
                next_page_link: nextPageLink,
              },
            };
          } else {
            returnData = {
              users: validUsers,
              meta: {
                next_page_link: null,
              },
            };
          }
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ token: validToken, nextPageLink })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextPageLink,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ token: validToken, nextPageLink: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ token: 'foo-bar', nextPageLink })).rejects.toBeInstanceOf(
        AircallError
      );
    });
  });
});
