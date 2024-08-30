import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { getOrganisationUserIds, getUsers } from './users';
import type { MicrosoftUser } from './users';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const tenantId = 'some-tenant-id';

const invalidUsers = [
  {
    mail: `user-invalid@foo.bar`,
    userPrincipalName: `user-invalid`,
    displayName: `user invalid`,
  },
];

const validUsers: (MicrosoftUser & { userType: string })[] = Array.from(
  { length: env.USERS_SYNC_BATCH_SIZE - invalidUsers.length },
  (_, i) => ({
    id: `user-id-${i}`,
    userType: i < 50 ? 'Member' : 'Guest',
    mail: `user-${i}@foo.bar`,
    userPrincipalName: `user-${i}`,
    displayName: `user ${i}`,
  })
);

const userIds = validUsers.filter((user) => user.userType === 'Member').map(({ id }) => id);

const users = [...validUsers, ...invalidUsers];

describe('auth connector', () => {
  // mock token API endpoint using msw
  beforeEach(() => {
    server.use(
      http.get(`${env.MICROSOFT_API_URL}/:tenantId/users`, ({ request, params }) => {
        if (
          request.headers.get('Authorization') !== `Bearer ${validToken}` ||
          params.tenantId !== tenantId
        ) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const select = url.searchParams.get('$select');
        const top = url.searchParams.get('$top');
        const skipToken = url.searchParams.get('$skiptoken');
        const filter = url.searchParams.get('$filter');

        const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftUser)[]);

        let filteredUsers = users;

        if (filter) {
          const [field, _, param] = filter.split(' ');

          if (field && param) {
            filteredUsers = users.filter((user) => `'${user[field]}'` === param);
          }
        }

        const formattedUsers = filteredUsers.map((user) =>
          selectedKeys.reduce<Partial<MicrosoftUser>>((acc, key: keyof MicrosoftUser) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
            acc[key] = user[key];
            return acc;
          }, {})
        );

        const nextPageUrl = new URL(url);
        nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

        return Response.json({
          '@odata.nextLink':
            skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
          value: formattedUsers.slice(0, top ? Number(top) : 0),
        });
      })
    );
  });

  describe('getUsers', () => {
    test('should return users and nextSkipToken when the token is valid and there is another page', async () => {
      await expect(
        getUsers({ tenantId, token: validToken, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        invalidUsers,
        validUsers: validUsers.map(({ userType: _userType, ...user }) => ({ ...user })),
        nextSkipToken,
      });
    });

    test('should return users and no nextSkipToken when the token is valid and there is no other page', async () => {
      await expect(
        getUsers({ tenantId, token: validToken, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        invalidUsers,
        validUsers: validUsers.map(({ userType: _userType, ...user }) => ({ ...user })),
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getUsers({ tenantId, token: 'invalid-token', skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the tenantId is invalid', async () => {
      await expect(
        getUsers({ tenantId: 'invalid-tenant-id', token: validToken, skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('getOrganisationUserIds', () => {
    test('should return userIds and nextSkipToken when the token is valid and there is another page', async () => {
      await expect(
        getOrganisationUserIds({ tenantId, token: validToken, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        userIds,
        nextSkipToken,
      });
    });

    test('should return userIds and no nextSkipToken when the token is valid and there is no other page', async () => {
      await expect(
        getOrganisationUserIds({ tenantId, token: validToken, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        userIds,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getOrganisationUserIds({ tenantId, token: 'invalid-token', skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the tenantId is invalid', async () => {
      await expect(
        getOrganisationUserIds({
          tenantId: 'invalid-tenant-id',
          token: validToken,
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
