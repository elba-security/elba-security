import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';
import type { AnthropicUser } from './users';
import { getUsers, deleteUser } from './users';

const validToken = 'valid-token-1234';
const nextId = `next-id`;
const endId = 'end-id';
const userId = 'test-user-id';

const validUsers: AnthropicUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
  role: 'admin',
}));

const invalidUsers: unknown[] = [];

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.ANTHROPIC_API_BASE_URL}/v1/organizations/users`, ({ request }) => {
          if (request.headers.get('x-api-key') !== validToken) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const afterId = url.searchParams.get('after_id');

          const responseData = {
            data: validUsers,
            has_more: afterId !== endId,
            last_id: afterId === endId ? null : nextId,
          };

          return Response.json(responseData);
        })
      );
    });

    test('should return users and nextPage when the token is valid and there is another page', async () => {
      await expect(getUsers({ apiKey: validToken, page: null })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextId,
      });
    });

    test('should return users and no nextPage when the token is valid and there is no other page', async () => {
      await expect(getUsers({ apiKey: validToken, page: endId })).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throw when the token is invalid', async () => {
      await expect(getUsers({ apiKey: 'invalid-token' })).rejects.toBeInstanceOf(IntegrationError);
    });
  });

  describe('deleteUser', () => {
    beforeEach(() => {
      server.use(
        http.delete<{ userId: string }>(
          `${env.ANTHROPIC_API_BASE_URL}/v1/organizations/users/:userId`,
          ({ request, params }) => {
            if (request.headers.get('x-api-key') !== validToken) {
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
      await expect(deleteUser({ apiKey: validToken, userId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(deleteUser({ apiKey: validToken, userId: 'invalid' })).resolves.not.toThrow();
    });

    test('should throw IntegrationError when token is invalid', async () => {
      await expect(deleteUser({ apiKey: 'invalidToken', userId })).rejects.toStrictEqual(
        new IntegrationError('Could not delete user with Id: test-user-id', {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          response: expect.any(Response),
        })
      );
    });
  });
});
