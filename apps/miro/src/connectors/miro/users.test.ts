import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MiroError } from '../common/error';
import { getUsers, getTokenInfo, type MiroUser } from './users';

const validToken = 'token-1234';
const orgId = 'test-miro-id';
const workspaceId = 'test-workspace-id';
const endPageToken = 'end-page-token';
const nextPageToken = 'next-page-token';

const validUsers: MiroUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  email: `user-${i}@foo.bar`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
}));

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MIRO_API_BASE_URL}/miros/${orgId}/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const pageToken = url.searchParams.get('page_token');
        const responseData = {
          value: validUsers,
          next: pageToken === endPageToken ? null : nextPageToken,
        };
        return Response.json(responseData);
      })
    );
  });

  test('should fetch users when token is valid', async () => {
    const result = await getUsers({
      token: validToken,
      orgId,
    });
    expect(result).toEqual({
      validUsers,
      invalidUsers,
      nextPage: nextPageToken,
    });
  });

  test('should throw MiroError when token is invalid', async () => {
    await expect(
      getUsers({
        token: 'invalidToken',
        orgId,
      })
    ).rejects.toThrowError(MiroError);
  });
});

describe('getTokenInfo', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MIRO_API_BASE_URL}/workspaces`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const responseData = {
          value: [
            {
              id: workspaceId,
              suspended: false,
            },
          ],
        };
        return Response.json(responseData);
      })
    );
  });

  test('should fetch workspaces when token is valid', async () => {
    const result = await getTokenInfo(validToken);
    expect(result).toEqual(workspaceId);
  });

  test('should throw MiroError when token is invalid', async () => {
    await expect(getTokenInfo('invalidToken')).rejects.toThrowError(MiroError);
  });
});
