/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '../../vitest/setup-msw-handlers';
import { type SumologicUser, getUsers, deleteUsers } from './users';
import { SumologicError } from './commons/error';

const nextCursor = 'test-next-cursor';
const accessId = 'test-access-id';
const accessKey = 'test-access-key';
const userId = 'test-user-id';
const sourceRegion = 'EU';
const validEncodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');

const validUsers: SumologicUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: '0442f541-45d2-487a-9e4b-de03ce4c559e',
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  isActive: true,
  isMfaEnabled: false,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getSumologicUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(
        `https://api.${sourceRegion.toLowerCase()}.sumologic.com/api/v1/users`,
        ({ request }) => {
          if (request.headers.get('Authorization') !== `Basic ${validEncodedKey}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const after = url.searchParams.get('token');
          let returnData;
          if (after) {
            returnData = {
              data: validUsers,
              next: nextCursor,
            };
          } else {
            returnData = {
              data: validUsers,
              next: null,
            };
          }
          return Response.json(returnData);
        }
      )
    );
  });

  test('should return users and nextPage when the token is valid and their is another page', async () => {
    await expect(
      getUsers({ accessId, accessKey, sourceRegion, afterToken: nextCursor })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: nextCursor,
    });
  });

  test('should return users and no nextPage when the token is valid and their is no other page', async () => {
    await expect(
      getUsers({ accessId, accessKey, sourceRegion, afterToken: null })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getUsers({ accessId: 'foo-id', accessKey: 'foo-key', sourceRegion, afterToken: nextCursor })
    ).rejects.toBeInstanceOf(SumologicError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ userId: string }>(
        `https://api.${sourceRegion.toLowerCase()}.sumologic.com/api/v1/users/${userId}`,
        ({ request, params }) => {

          const encodedKey = Buffer.from(`${accessId}:${accessKey}`).toString('base64');
          if (request.headers.get('Authorization') !== `Basic ${encodedKey}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.userId !== userId) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user successfully when token is valid', async () => {
    await expect(deleteUsers({ accessId, accessKey, sourceRegion, userId })).resolves.not.toThrow();
  });

  test('should not throw when the user is not found', async () => {
    await expect(deleteUsers({ accessId, accessKey, sourceRegion, userId })).resolves.toBeUndefined();
  });

  test('should throw SumologicError when token is invalid', async () => {
    await expect(deleteUsers({ accessId: 'invalidAccessId', accessKey: 'invalidKey', sourceRegion, userId })).rejects.toBeInstanceOf(
      SumologicError
    );
  });
});
