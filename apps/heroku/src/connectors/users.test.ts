/* eslint-disable @typescript-eslint/no-unsafe-return -- convenience */
/* eslint-disable @typescript-eslint/no-unsafe-call -- convenience */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { HerokuError } from './commons/error';
import { getUsers, deleteUser } from './users';

const validToken = 'valid-token';
const nextRange = 'next-range';
const lastRange = 'last-range';
const validTeamId = 'team-id';

const users = Array.from({ length: 20 }, (_, i) => ({
  user: {
    email: `user-${i}@foo.bar`,
    id: `user-${i}`,
  },
  two_factor_authentication: true,
  role: 'foobar',
}));

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get<{ teamId: string }>(
        'https://api.heroku.com/teams/:teamId/members',
        ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.teamId !== validTeamId) {
            return new Response(undefined, { status: 404 });
          }
          const responseData = users;
          if (request.headers.get('Range') === lastRange) {
            return Response.json(responseData);
          }
          return Response.json(responseData, { headers: { 'Next-Range': nextRange } });
        }
      )
    );
  });

  test('should returns users & nextCursor when their is other page', async () => {
    await expect(getUsers(validToken, validTeamId, null)).resolves.toMatchObject({
      nextCursor: nextRange,
      users,
    });
  });

  test('should returns teams & nextCursor=null when their is no other page', async () => {
    await expect(getUsers(validToken, validTeamId, lastRange)).resolves.toMatchObject({
      nextCursor: null,
      users,
    });
  });

  test('should throw an error when team does not exist', async () => {
    await expect(getUsers(validToken, 'invalid-team-id', null)).rejects.toBeInstanceOf(HerokuError);
  });

  test('should throw an error when team does not exist', async () => {
    await expect(getUsers('invalid-token', validTeamId, null)).rejects.toBeInstanceOf(HerokuError);
  });
});

describe('deleteUser', () => {
  beforeEach(() => {
    server.use(
      http.delete<{ teamId: string; userId: string }>(
        `https://api.heroku.com/teams/:teamId/members/:userId`,
        ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }
          if (params.teamId !== validTeamId) {
            return new Response(undefined, { status: 404 });
          }
          if (!users.some(({ user }) => user.id === params.userId)) {
            return new Response(undefined, { status: 404 });
          }
          return new Response(undefined, { status: 200 });
        }
      )
    );
  });

  test('should delete user when team & user & token are valid', async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
    await expect(deleteUser(validToken, validTeamId, users[0]!.user.id)).resolves.toBeUndefined();
  });

  test('should not throw when team does not exist', async () => {
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
      deleteUser(validToken, 'invalid-team-id', users[0]!.user.id)
    ).resolves.toBeUndefined();
  });

  test('should not throw when user does not exist', async () => {
    await expect(deleteUser(validToken, validTeamId, 'unknown-user')).resolves.toBeUndefined();
  });

  test('should throw HerokuError when token is invalid', async () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
    await expect(deleteUser('invalidToken', validTeamId, users[0]!.user.id)).rejects.toBeInstanceOf(
      HerokuError
    );
  });
});
