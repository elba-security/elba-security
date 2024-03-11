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
import type { DocusignUser } from './users';
import { getUsers } from './users';
import { DocusignError } from './commons/error';

const validToken = 'token-1234';
const endPosition = '3';
const TESTAPIBASEURL = 'https://demo.docusign.net';
const accountID = '9e3e93c4-12cb-42e2-9295-34937f303a9a';

const validUsers: DocusignUser[] = Array.from({ length: 5 }, (_, i) => ({
  userId: `id-${i}`,
  userName: `userName-${i}`,
  firstName: `firstName-${i}`,
  middleName: `middleName-${i}`,
  lastName: `lastName-${i}`,
  userStatus: 'active',
  isAdmin: 'admin',
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${TESTAPIBASEURL}/restapi/v2.1/accounts/${accountID}/users`, ({ request }) => {
          // briefly implement API endpoint behaviour
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const startingAfter = url.searchParams.get('startPosition');
          let returnData;
          if (startingAfter) {
            returnData = {
              users: validUsers,
              totalSetSize: '30',
              endPosition,
            };
          } else {
            returnData = {
              users: validUsers,
              totalSetSize: '10',
              endPosition: '10',
            };
          }
          return Response.json(returnData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ token: validToken, accountID, apiBaseURI: TESTAPIBASEURL, start: 'start' })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(endPosition, 10) + 1,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ token: validToken, accountID, apiBaseURI: TESTAPIBASEURL, start: '' })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: '',
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ token: 'foo-bar', accountID, apiBaseURI: TESTAPIBASEURL })
      ).rejects.toBeInstanceOf(DocusignError);
    });
  });
});
