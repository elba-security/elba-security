import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { BitbucketError } from '../common/error';
import type { BitbucketUser } from './users';
import { getUsers } from './users';

const validToken = 'token-1234';
const workspaceId = '00000000-0000-0000-0000-000000000001';
const nextUri = `${env.BITBUCKET_API_BASE_URL}/workspaces/${workspaceId}/members?page=5`;
const endPosition = '5';
const validUsers: BitbucketUser[] = Array.from({ length: 5 }, (_, i) => ({
  user: {
    uuid: `user-id-${i}`,
    display_name: `user ${i}`,
  },
  workspace: {
    slug: `test-workspace-name-${i}`,
  },
}));

const invalidUsers = [];

describe('users connector', () => {
  describe('getUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.BITBUCKET_API_BASE_URL}/workspaces/${workspaceId}/members`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            const url = new URL(request.url);
            const position = url.searchParams.get('page');
            const returnData =
              position !== endPosition
                ? {
                    values: validUsers,
                    next: nextUri,
                  }
                : {
                    values: validUsers,
                  };
            return Response.json(returnData);
          }
        )
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(
        getUsers({ accessToken: validToken, workspaceId, page: null })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: nextUri,
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({
          accessToken: validToken,
          workspaceId,
          page: nextUri,
        })
      ).resolves.toStrictEqual({
        validUsers,
        invalidUsers,
        nextPage: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', workspaceId })).rejects.toBeInstanceOf(
        BitbucketError
      );
    });
  });
});
