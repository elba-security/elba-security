import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { FrontappError } from '../common/error';
import type { FrontappUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';

const validUsers: FrontappUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  username: `username-${i}`,
  email: `user-${i}@foo.bar`,
  first_name: `first_name-${i}`,
  last_name: `last_name-${i}`,
  is_admin: false,
  is_blocked: false,
}));

describe('users connector', () => {
  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.FRONTAPP_API_BASE_URL}/teammates`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            _pagination: {
              next: null,
            },
            _results: validUsers,
          });
        })
      );
    });

    const invalidUsers = [];

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(getUsers(validToken)).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers('foo-bar')).rejects.toBeInstanceOf(FrontappError);
    });
  });
});
