import { http } from 'msw';
import { expect, test, describe, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MakeError } from '../common/error';
import { type MakeUser, getUsers } from './users';

const apiToken = 'test-token';
const zoneDomain = 'eu2.make.com';
const selectedOrganizationId = 'test-selected-organization-id';
const nextOffset = '10';
const lastOffset = 20;
const validUsers: MakeUser[] = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  name: `name-${i}`,
  email: `user-${i}@foo.bar`,
}));

const invalidUsers = [];

describe('getUsers', () => {
  beforeEach(() => {
    server.use(
      http.get(`https://${zoneDomain}/api/v2/users`, ({ request }) => {
        if (request.headers.get('Authorization') !== `Token ${apiToken}`) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const offset = parseInt(url.searchParams.get('pg[offset]') || '0');
        const limit = parseInt(url.searchParams.get('pg[limit]') || '0');
        return Response.json({
          users: offset === lastOffset ? [] : validUsers,
          pg: { limit, offset },
        });
      })
    );
  });

  test('should return users and nextPage when the token is valid and their is another page', async () => {
    await expect(
      getUsers({ apiToken, zoneDomain, selectedOrganizationId, page: nextOffset })
    ).resolves.toStrictEqual({
      validUsers,
      invalidUsers,
      nextPage: parseInt(nextOffset, 10) + env.MAKE_USERS_SYNC_BATCH_SIZE,
    });
  });

  test('should return users and no nextPage when the token is valid and their is no other page', async () => {
    await expect(
      getUsers({ apiToken, zoneDomain, selectedOrganizationId, page: String(lastOffset) })
    ).resolves.toStrictEqual({
      validUsers: [],
      invalidUsers,
      nextPage: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getUsers({
        apiToken: 'foo-id',
        zoneDomain,
        selectedOrganizationId,
        page: nextOffset,
      })
    ).rejects.toBeInstanceOf(MakeError);
  });
});
