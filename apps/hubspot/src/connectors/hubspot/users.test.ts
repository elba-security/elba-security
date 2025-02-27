import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { HubspotError } from '../common/error';
import type { HubspotUser } from './users';
import { getUsers, deleteUser, getAuthUser, getAccountInfo } from './users';

const validToken = 'token-1234';
const endPage = '3';
const nextPage = '2';
const testId = 'test-id';
const accountInfo = {
  timeZone: 'us/eastern',
  uiDomain: 'foo-bar.hubspot.com',
  portalId: 123413121,
};

const validUsers: HubspotUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
  superAdmin: true,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.HUBSPOT_API_BASE_URL}/settings/v3/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('after');
          const responseData =
            after === endPage
              ? { results: validUsers }
              : { results: validUsers, paging: { next: { after: nextPage } } };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, page: nextPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers({ accessToken: validToken, page: endPage })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar' })).rejects.toBeInstanceOf(HubspotError);
    });
  });

  describe('getAuthUser', () => {
    beforeEach(() => {
      server.use(
        http.get<{ testId: string }>(
          `${env.HUBSPOT_API_BASE_URL}/oauth/v1/access-tokens/:validToken`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            return Response.json({
              user: 'test-user',
              user_id: 1234,
            });
          }
        )
      );
    });

    test('should get the auth user information', async () => {
      await expect(getAuthUser(validToken)).resolves.toStrictEqual({ authUserId: '1234' });
    });

    test('should throw HubspotError when token is invalid', async () => {
      await expect(getAuthUser('invalid-token')).rejects.toBeInstanceOf(HubspotError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ testId: string }>(
          `${env.HUBSPOT_API_BASE_URL}/settings/v3/users/:userId`,
          ({ request }) => {
            const url = new URL(request.url.toString());
            const userId = url.pathname.split('/').pop();

            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (userId !== testId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(deleteUser({ accessToken: validToken, userId: testId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({
          accessToken: validToken,
          userId: 'invalid-user-id',
        })
      ).resolves.toBeUndefined();
    });

    test('should throw HubspotError when token is invalid', async () => {
      await expect(
        deleteUser({ accessToken: 'invalidToken', userId: testId })
      ).rejects.toBeInstanceOf(HubspotError);
    });
  });

  describe('getAccountInfo', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.HUBSPOT_API_BASE_URL}/account-info/v3/details`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          return Response.json(accountInfo);
        })
      );
    });

    test('should return the accessToken when the code is valid', async () => {
      await expect(getAccountInfo(validToken)).resolves.toStrictEqual(accountInfo);
    });

    test('should throw when the code is invalid', async () => {
      await expect(getAccountInfo('wrong-code')).rejects.toBeInstanceOf(HubspotError);
    });
  });
});
