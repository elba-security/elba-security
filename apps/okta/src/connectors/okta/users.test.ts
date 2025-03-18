import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { OktaError } from '../common/error';
import { getUsers, getAuthUser, type OktaUser } from './users';

const validToken = 'token-1234';
const subDomain = 'test-org-id';
const endPageToken = 'end-page-token';
const nextPageToken = 'next-page-token';

const validUsers: OktaUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.OKTA_API_BASE_URL}/v2/orgs/${subDomain}/members`, ({ request }) => {
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
      subDomain,
    });
    expect(result).toEqual({
      validUsers,
      invalidUsers,
      nextPage: nextPageToken,
    });
  });

  test('should throw OktaError when token is invalid', async () => {
    await expect(
      getUsers({
        token: 'invalidToken',
        subDomain,
      })
    ).rejects.toThrowError(OktaError);
  });
});

describe('getAuthUser', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.OKTA_API_BASE_URL}/v1/oauth-token`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const responseData = {
          organization: {
            id: subDomain,
          },
        };
        return Response.json(responseData);
      })
    );
  });

  test('should fetch workspaces when token is valid', async () => {
    const result = await getAuthUser(validToken);
    expect(result).toEqual(subDomain);
  });

  test('should throw OktaError when token is invalid', async () => {
    await expect(getAuthUser('invalidToken')).rejects.toThrowError(OktaError);
  });
});
