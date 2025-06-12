import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { ApaleoUser } from './users';
import { getUsers, deactivateUser } from './users';

const validToken = 'token-1234';
const userId = 'test-id';

const validUsers: ApaleoUser[] = Array.from({ length: 5 }, (_, i) => ({
  subjectId: `id-${i}`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.APALEO_API_BASE_URL}/api/v1/users`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            users: validUsers,
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers(validToken)).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validToken)).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should throw when the token is invalid', async () => {
      await expect(getUsers('invalid-token')).rejects.toStrictEqual(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
        new IntegrationError('Could not retrieve users', { response: expect.any(Response) })
      );
    });
  });

  describe('deactivateUser', () => {
    beforeEach(() => {
      server.use(
        http.patch<{ userId: string }>(
          `${env.APALEO_API_BASE_URL}/api/v1/users/:userId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
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
      await expect(deactivateUser({ accessToken: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        deactivateUser({ accessToken: validToken, userId: 'invalid' })
      ).resolves.not.toThrow();
    });

    test('should throw IntegrationError when token is invalid', async () => {
      await expect(deactivateUser({ accessToken: 'invalidToken', userId })).rejects.toStrictEqual(
        new IntegrationError('Could not deactivate user with Id: test-id', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          response: expect.any(Response),
        })
      );
    });
  });
});
