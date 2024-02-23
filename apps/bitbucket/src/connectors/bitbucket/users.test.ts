import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '../../../vitest/setup-msw-handlers';
import { BitbucketError } from '../commons/error';
import type { BitbucketUser } from './users';
import { getUsers } from './users';

const accessToken = 'token-1234';
const workspaceId = 'some-workspace-id';
const nextUrl = `https://api.bitbucket.org/2.0/workspaces/${workspaceId}/members?page=2`;
const pageLength = 5;

const membershipResponse = Array.from({ length: pageLength }, (_, i) => ({
  user: {
    account_id: `user-id-${i}`,
    display_name: `user ${i}`,
  },
}));

const mappedUsers: BitbucketUser[] = membershipResponse.map((m) => ({
  accountId: m.user.account_id,
  displayName: m.user.display_name,
}));

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          'https://api.bitbucket.org/2.0/workspaces/:workspaceId/members',
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${accessToken}`) {
              return new Response(undefined, { status: 401 });
            }
            if (params.workspaceId !== workspaceId) {
              return new Response(undefined, { status: 404 });
            }

            const pageQuery = new URL(request.url).searchParams.get('page');

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
            return Response.json({
              values: membershipResponse,
              pagelen: pageLength,
              size: pageLength,
              page: pageQuery ? parseInt(pageQuery) : 1,
              next: pageQuery ? undefined : nextUrl,
            });
          }
        )
      );
    });
    test('should return users and nextUrl when the token is valid and there are more users', async () => {
      await expect(getUsers({ accessToken, workspaceId, nextUrl: null })).resolves.toStrictEqual({
        users: mappedUsers,
        nextUrl,
      });
    });
    test('should return users and no nextUrl when the token is valid and there are no more users', async () => {
      await expect(getUsers({ accessToken, workspaceId, nextUrl })).resolves.toStrictEqual({
        users: mappedUsers,
        nextUrl: null,
      });
    });
    test('should throw when the token is invalid', async () => {
      await expect(
        getUsers({ accessToken: 'invalid-token', workspaceId, nextUrl: null })
      ).rejects.toBeInstanceOf(BitbucketError);
    });
    test('should throws when the workspaceId is invalid', async () => {
      await expect(
        getUsers({ accessToken, workspaceId: 'bad-workspace-id', nextUrl: null })
      ).rejects.toBeInstanceOf(BitbucketError);
    });
  });
});
