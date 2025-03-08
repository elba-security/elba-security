import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MuralError } from '../common/error';
import { getUsers, getWorkspaceIds, getMurals, type MuralUser } from './users';

const validToken = 'token-1234';
const muralId = 'test-mural-id';
const workspaceId = 'test-workspace-id';
const endPageToken = 'end-page-token';
const nextPageToken = 'next-page-token';

const validUsers: MuralUser[] = Array.from({ length: 5 }, (_, i) => ({
  id: `id-${i}`,
  email: `user-${i}@foo.bar`,
  firstName: `firstName-${i}`,
  lastName: `lastName-${i}`,
}));

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MURAL_API_BASE_URL}/murals/${muralId}/users`, ({ request }) => {
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
      muralId,
    });
    expect(result).toEqual({
      validUsers,
      invalidUsers,
      nextPage: nextPageToken,
    });
  });

  test('should throw MuralError when token is invalid', async () => {
    await expect(
      getUsers({
        token: 'invalidToken',
        muralId,
      })
    ).rejects.toThrowError(MuralError);
  });
});

describe('getWorkspaceIds', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MURAL_API_BASE_URL}/workspaces`, ({ request }) => {
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
    const result = await getWorkspaceIds(validToken);
    expect(result).toEqual(workspaceId);
  });

  test('should throw MuralError when token is invalid', async () => {
    await expect(getWorkspaceIds('invalidToken')).rejects.toThrowError(MuralError);
  });
});

describe('getMurals', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MURAL_API_BASE_URL}/workspaces/${workspaceId}/murals`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const responseData = {
          value: [
            {
              id: muralId,
            },
          ],
        };
        return Response.json(responseData);
      })
    );
  });

  test('should fetch murals when token is valid', async () => {
    const result = await getMurals({ token: validToken, workspaceId });
    expect(result).toEqual(muralId);
  });

  test('should throw MuralError when token is invalid', async () => {
    await expect(getMurals({ token: 'invalid-token', workspaceId })).rejects.toThrowError(
      MuralError
    );
  });
});
