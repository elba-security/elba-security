import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { OktaError } from '../common/error';
import { getUsers, getAuthUser, type OktaUser } from './users';

const validToken = 'token-1234';
const subDomain = 'test-subdomain';
const endPage = 'end-page';
const nextPage = 'http://test-subdomain.okta.com/api/v1/users?limit=10&after=next-page';

const validUsers: OktaUser[] = [
  {
    id: 'user-id',
    profile: {
      firstName: 'first-name',
      lastName: 'last-name',
      email: 'test-user-@foo.bar',
    },
  },
];

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${subDomain}.okta.com/api/v1/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const after = url.searchParams.get('after');

        let linkHeader = '';

        if (after !== endPage) {
          linkHeader += `<http://${subDomain}.okta.com/api/v1/users?limit=${env.OKTA_USERS_SYNC_BATCH_SIZE}&after=next-page>; rel="next";`;
        }

        return Response.json(validUsers, {
          headers: {
            link: linkHeader,
          },
        });
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
      nextPage,
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
      http.get(`https://${subDomain}.okta.com/api/v1/users/me`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const responseData = {
          id: 'test-auth-id',
        };
        return Response.json(responseData);
      })
    );
  });

  test('should fetch workspaces when token is valid', async () => {
    const result = await getAuthUser({ token: validToken, subDomain });
    expect(result).toEqual('test-auth-id');
  });

  test('should throw OktaError when token is invalid', async () => {
    await expect(getAuthUser({ token: 'invalidToken', subDomain })).rejects.toThrowError(OktaError);
  });
});
