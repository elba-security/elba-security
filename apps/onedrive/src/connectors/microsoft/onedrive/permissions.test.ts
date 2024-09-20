import { http } from 'msw';
import { z } from 'zod';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import * as getPermissionsConnector from './permissions';
import type { OnedrivePermission } from './permissions';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const userId = 'some-user-id';
const itemId = 'some-item-id';
const permissionId = 'permission-id';

const dataSchema = z.object({
  grantees: z
    .array(
      z.object({
        email: z.string(),
      })
    )
    .min(1),
});

// TODO: anyone
const permissions: OnedrivePermission[] = Array.from({ length: 2 }, (_, i) => ({
  id: `permission-id-${i}`,
  roles: ['write'],
  link: { scope: 'users' },
  grantedToV2: {
    user: {
      email: `some-user-email-${i}`,
    },
  },
  grantedToIdentitiesV2: [
    {
      user: {
        email: `some-user-email-${i}`,
      },
    },
  ],
}));

describe('permissions connector', () => {
  describe('getItemPermissions', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/users/:userId/drive/items/:itemId/permissions`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId ||
              params.itemId !== itemId
            ) {
              return new Response(undefined, { status: 401 });
            }
            const url = new URL(request.url);
            const top = url.searchParams.get('$top');
            const skipToken = url.searchParams.get('$skiptoken');

            const nextPageUrl = new URL(url);

            if (skipToken === startSkipToken) {
              nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);
            } else if (skipToken === nextSkipToken) {
              nextPageUrl.searchParams.set('$skiptoken', endSkipToken);
            } else {
              nextPageUrl.searchParams.set('$skiptoken', '');
            }

            return Response.json({
              '@odata.nextLink':
                skipToken === null ? null : decodeURIComponent(nextPageUrl.toString()),
              value: permissions.slice(0, top ? Number(top) : 0),
            });
          }
        )
      );
    });

    test('should return permissions and nextSkipToken when the data is valid and there is another page', async () => {
      await expect(
        getPermissionsConnector.getItemPermissions({
          token: validToken,
          userId,
          itemId,
          skipToken: startSkipToken,
        })
      ).resolves.toStrictEqual({
        permissions,
        nextSkipToken,
      });
    });

    test('should return permissions and no nextSkipToken when the data is valid and there is no other page', async () => {
      await expect(
        getPermissionsConnector.getItemPermissions({
          token: validToken,
          userId,
          itemId,
          skipToken: null,
        })
      ).resolves.toStrictEqual({
        permissions,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.getItemPermissions({
          token: 'invalid-token',
          userId,
          itemId,
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the userId is invalid', async () => {
      await expect(
        getPermissionsConnector.getItemPermissions({
          token: validToken,
          userId: 'invalid-userId',
          itemId,
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getPermissionsConnector.getItemPermissions({
          token: validToken,
          userId,
          itemId: 'invalid-itemId',
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('deleteItemPermission', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.delete(
          `${env.MICROSOFT_API_URL}/users/:userId/drive/items/:itemId/permissions/:permissionId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId ||
              params.permissionId !== permissionId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should resolves when the token and data is valid', () => {
      expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          userId,
          itemId,
          permissionId,
        })
      ).resolves;
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: 'invalid-token',
          userId,
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the userId is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          userId: 'invalid-userId',
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should be ignored when itemId is not found', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          userId,
          itemId: 'invalid-itemId',
          permissionId,
        })
      ).resolves.toStrictEqual('ignored');
    });

    test('should throws when the permissionId is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          userId,
          itemId,
          permissionId: 'invalid-permission-id',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('revokeUsersFromLinkPermission', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(
          'https://graph.microsoft.com/beta/users/:userId/drive/items/:itemId/permissions/:permissionId/revokeGrants',
          async ({ request, params }) => {
            const body = await request.json();
            const parseResult = dataSchema.safeParse(body);

            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId ||
              params.permissionId !== permissionId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            } else if (!parseResult.success) {
              return new Response(undefined, { status: 500 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should resolves when the token and data is valid', () => {
      expect(
        getPermissionsConnector.revokeUsersFromLinkPermission({
          token: validToken,
          userId,
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).resolves;
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUsersFromLinkPermission({
          token: 'invalid-token',
          userId,
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the userId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUsersFromLinkPermission({
          token: validToken,
          userId: 'invalid-userId',
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUsersFromLinkPermission({
          token: validToken,
          userId,
          itemId: 'invalid-itemId',
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the permissionId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUsersFromLinkPermission({
          token: validToken,
          userId,
          itemId,
          permissionId: 'invalid-permission-id',
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the no user emails is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUsersFromLinkPermission({
          token: validToken,
          userId,
          itemId,
          permissionId,
          userEmails: [],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('getPermissionDetails', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/users/:userId/drive/items/:itemId/permissions/:permissionId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId ||
              params.permissionId !== permissionId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            }

            return Response.json({ ...permissions[0] });
          }
        )
      );
    });

    test('should resolves when the token and data is valid', () => {
      expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          userId,
          itemId,
          permissionId,
        })
      ).resolves;
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: 'invalid-token',
          userId,
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the userId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          userId: 'invalid-userId',
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          userId,
          itemId: 'invalid-itemId',
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the permissionId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          userId,
          itemId,
          permissionId: 'invalid-permission-id',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should return the permission details properly', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          userId,
          itemId,
          permissionId,
        })
      ).resolves.toStrictEqual({ ...permissions[0] });
    });
  });
});
