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
import type { PipedriveUser } from './users';
import { getUsers } from './users';
import { PipedriveError } from './commons/error';

const validToken = 'token-1234';
const nextPage = 11;
const TESTAPIDOMAIN = 'https://sky-sandbox.pipedrive.com';

const validUsers: PipedriveUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  active_flag: true,
  is_admin: 1,
  phone: null,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${TESTAPIDOMAIN}/v1/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const start = url.searchParams.get('start');
          let returnData;
          if (start) {
            returnData = {
              data: validUsers,
              additional_data: {
                pagination: {
                  start: 10,
                  limit: 100,
                  more_items_in_collection: true,
                  next_start: nextPage,
                },
              },
            };
          } else {
            returnData = {
              data: validUsers,
              additional_data: {},
            };
          }
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ token: validToken, apiDomain: TESTAPIDOMAIN, start: '10' })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ token: validToken, apiDomain: TESTAPIDOMAIN, start: '' })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ token: 'foo-bar', apiDomain: TESTAPIDOMAIN, start: '10' })
      ).rejects.toBeInstanceOf(PipedriveError);
    });
  });
});
