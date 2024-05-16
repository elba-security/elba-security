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
import { type CloudflareUser, getUsers } from './users';
import { CloudflareError } from './commons/error';

const validAuthEmail = 'valid-auth-email';
const validAuthKey = 'valid-auth-key';

const users: CloudflareUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  user: {
    first_name: `first-name-${i}`,
    last_name: `last-name-${i}`,
    email: `username-${i}@gmail.com`,
  },
  email: `user-${i}@foo.bar`,
}));

const accountId = '870168ae30f7af9fd09b949c174e5ca7';

describe('auth connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get('https://api.cloudflare.com/client/v4/accounts', () => {
          return Response.json(
            {
              result: [
                {
                  id: accountId,
                },
              ],
            },
            { status: 200 }
          );
        }),
        http.get(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/members`,
          ({ request }) => {
            // briefly implement API endpoint behaviour
            if (
              request.headers.get('X-Auth-Email') !== validAuthEmail ||
              request.headers.get('X-Auth-Key') !== validAuthKey
            ) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json({
              result_info: {
                total_pages: 2,
              },
              result: users,
            });
          }
        )
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validAuthKey, validAuthEmail, 1)).resolves.toStrictEqual({
        users,
        nextPage: 2,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validAuthKey, validAuthEmail, 2)).resolves.toStrictEqual({
        users,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('foo-bar-auth-key', 'foo-bar-auth-email', 0)).rejects.toBeInstanceOf(
        CloudflareError
      );
    });
  });
});
