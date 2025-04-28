import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { MiroError } from '../common/error';
import { getUsers, getTokenInfo, type MiroUser } from './users';

const validToken = 'token-1234';
const orgId = 'test-org-id';
const endPageToken = 'end-page-token';
const nextPageToken = 'next-page-token';

const validUsers: MiroUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MIRO_API_BASE_URL}/v2/orgs/${orgId}/members`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        const responseData = {
          data: validUsers,
          cursor: cursor === endPageToken ? null : nextPageToken,
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
      http.get(`${env.MIRO_API_BASE_URL}/v1/oauth-token`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const responseData = {
          organization: {
            id: orgId,
          },
        };
        return Response.json(responseData);
      })
    );
  });

  test('should fetch workspaces when token is valid', async () => {
    const result = await getTokenInfo(validToken);
    expect(result).toEqual(orgId);
  });

  test('should throw MiroError when token is invalid', async () => {
    await expect(getTokenInfo('invalidToken')).rejects.toThrowError(MiroError);
  });
});
