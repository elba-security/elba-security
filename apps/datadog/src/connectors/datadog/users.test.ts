/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { DatadogError } from '../common/error';
import type { DatadogUser } from './users';
import { getUsers, deleteUser } from './users';

const validApiKey = 'apiKey-1234';
const validAppKey = 'appKey-1234';
const endPageCursor = '2';
const nextPage = '1';
const after = 'test-after-cursor';
const userId = 'test-id';
const appKey = 'test-appKey';
const sourceRegion = 'EU';

const validUsers: DatadogUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  attributes: {
    name: `name-${i}`,
    email: `user-${i}@foo.bar`,
    status: 'Active',
    mfa_enabled: false,
  },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.DATADOG_EU_API_BASE_URL}/api/v2/users`, ({ request }) => {
          if (request.headers.get('DD-API-KEY') !== `Bearer ${validApiKey}`) {
            return new Response(undefined, { status: 401 });
          }
          if (request.headers.get('DD-APPLICATION-KEY') !== `Bearer ${validAppKey}`) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const afterCursor = url.searchParams.get('page[cursor]');
          const responseData = {
            data: validUsers,
            meta:
              afterCursor === endPageCursor
                ? {
                    page: {},
                  }
                : {
                    page: {
                      after,
                    },
                  },
          };
          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ apiKey: validApiKey, appKey, sourceRegion, afterCursor: nextPage })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: parseInt(nextPage, 10) + env.DATADOG_USERS_SYNC_BATCH_SIZE,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ apiKey: validApiKey, appKey, sourceRegion, afterCursor: endPageCursor })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ apiKey: 'foo-bar', appKey, sourceRegion })).rejects.toBeInstanceOf(
        DatadogError
      );
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ accountId: string }>(
          `https://${appKey}.atlassian.net/rest/api/3/user`,
          ({ request }) => {
            if (request.headers.get('DD-API-KEY') !== `Bearer ${validApiKey}`) {
              return new Response(undefined, { status: 401 });
            }
            if (request.headers.get('DD-APPLICATION-KEY') !== `Bearer ${validAppKey}`) {
              return new Response(undefined, { status: 401 });
            }
            const url = new URL(request.url);
            const accountId = url.searchParams.get('accountId');

            if (accountId !== userId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, appKey, sourceRegion, userId })
      ).resolves.not.toThrow();
    });

    test.only('should not throw when the user is not found', async () => {
      await expect(
        deleteUser({ apiKey: validApiKey, appKey, sourceRegion, userId: 'invalid-user-id' })
      ).resolves.toBeUndefined();
    });

    test('should throw DatadogError when token is invalid', async () => {
      await expect(
        deleteUser({ apiKey: 'invalidApiKey', appKey, sourceRegion, userId })
      ).rejects.toBeInstanceOf(DatadogError);
    });
  });
});
