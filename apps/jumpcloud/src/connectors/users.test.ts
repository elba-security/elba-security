/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import type { ResponseResolver } from 'msw';
import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../vitest/setup-msw-handlers';
import { type JumpcloudUser, getUsers, deleteUser } from './users';
import { JumpcloudError } from './commons/error';

const nextCursor = 'test-next-cursor';
const validApiKey = 'test-api-key';
const memberId = 'test-member-id';
const adminId = 'test-admin-id';

const validUsers: JumpcloudUser[] = Array.from({ length: 5 }, (_, i) => ({
  _id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  firstname: `firstname-${i}`,
  lastname: `lastname-${i}`,
  suspended: false,
  enableMultiFactor: false,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getJumpcloudUsers', () => {
  beforeEach(() => {
    const resolver: ResponseResolver = ({ request }) => {
      if (request.headers.get('x-api-key') !== `${validApiKey}`) {
        return new Response(undefined, { status: 401 });
      }

      const url = new URL(request.url);
      const after = url.searchParams.get('skip');
      let returnData;
      if (after) {
        returnData = {
          results: validUsers,
          skip: nextCursor,
        };
      } else {
        returnData = {
          results: validUsers,
        };
      }
      return Response.json(returnData);
    };
    server.use(http.get(`${env.JUMPCLOUD_API_BASE_URL}users`, resolver));
    server.use(http.get(`${env.JUMPCLOUD_API_BASE_URL}systemusers`, resolver));
  });

  test('should return users and nextPage when the apiKey is valid and their is another page', async () => {
    await expect(
      getUsers({ apiKey: validApiKey, after: nextCursor, role: 'admin' })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextCursor,
    });
  });

  test('should return users and no nextPage when the apiKey is valid and their is no other page', async () => {
    await expect(
      getUsers({ apiKey: validApiKey, after: null, role: 'member' })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getUsers({ apiKey: 'foo-id', after: nextCursor, role: 'admin' })
    ).rejects.toBeInstanceOf(JumpcloudError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ adminId: string }>(
        `${env.JUMPCLOUD_API_BASE_URL}users/:adminId`,
        ({ request, params }) => {
          if (request.headers.get('x-api-key') !== `${validApiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          if (params.adminId !== adminId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
    server.use(
      http.delete<{ memberId: string }>(
        `${env.JUMPCLOUD_API_BASE_URL}systemusers/:memberId`,
        ({ request, params }) => {
          if (request.headers.get('x-api-key') !== `${validApiKey}`) {
            return new Response(undefined, { status: 401 });
          }

          if (params.memberId !== memberId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token is valid and the user is a member', async () => {
    await expect(deleteUser({ userId: memberId, apiKey: validApiKey })).resolves.not.toThrow();
  });

  test('should delete user successfully when token is valid and the user is an admin', async () => {
    await expect(deleteUser({ userId: adminId, apiKey: validApiKey })).resolves.not.toThrow();
  });

  test('should not throw when the user is not found', async () => {
    await expect(
      deleteUser({ userId: 'some random id', apiKey: validApiKey })
    ).resolves.toBeUndefined();
  });

  test('should throw JumpcloudError when token is invalid', async () => {
    await expect(deleteUser({ userId: memberId, apiKey: 'invalid-key' })).rejects.toBeInstanceOf(
      JumpcloudError
    );
  });
});
