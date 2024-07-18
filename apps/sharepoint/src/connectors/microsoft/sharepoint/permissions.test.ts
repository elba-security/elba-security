import { http } from 'msw';
import { z } from 'zod';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import type { SharepointPermission } from './permissions';
import { getAllItemPermissions, getItemPermissions } from './permissions';
import * as getPermissionsConnector from './permissions';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
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

const permissions: SharepointPermission[] = Array.from({ length: 5 }, (_, i) => ({
  id: `permission-id-${i}`,
  roles: ['write'],
  link: { scope: 'users' },
  grantedToV2: {
    user: {
      id: `some-user-id-${i}`,
      email: `some-user-email-${i}`,
    },
  },
  grantedToIdentitiesV2: [
    {
      user: {
        id: `some-user-id-${i}`,
        email: `some-user-email-${i}`,
      },
    },
  ],
}));

describe('permissions connector', () => {
  describe('getAllItemPermissions', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/items/:itemId/permissions`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId ||
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
        getItemPermissions({
          token: validToken,
          siteId,
          driveId,
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
        getItemPermissions({
          token: validToken,
          siteId,
          driveId,
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
        getItemPermissions({
          token: 'invalid-token',
          siteId,
          driveId,
          itemId,
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getItemPermissions({
          token: validToken,
          siteId: 'invalid-siteId',
          driveId,
          itemId,
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getItemPermissions({
          token: validToken,
          siteId,
          driveId: 'invalid-driveId',
          itemId,
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getItemPermissions({
          token: validToken,
          siteId,
          driveId,
          itemId: 'invalid-itemId',
          skipToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should run getAllItemPermissions', async () => {
      vi.spyOn(getPermissionsConnector, 'getAllItemPermissions').mockResolvedValue({
        permissions,
        nextSkipToken: null,
      });

      await expect(
        getAllItemPermissions({
          token: validToken,
          siteId,
          driveId,
          itemId,
        })
      ).resolves.toStrictEqual({
        permissions,
        nextSkipToken: null,
      });

      expect(getAllItemPermissions).toBeCalledTimes(1);
    });
  });

  describe('deleteItemPermission', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.delete(
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/items/:itemId/permissions/:permissionId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId ||
              params.permissionId !== permissionId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            }

            return Response.json({ status: 200 });
          }
        )
      );
    });

    test('should resolves when the token and data is valid', () => {
      expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          siteId,
          driveId,
          itemId,
          permissionId,
        })
      ).resolves;
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: 'invalid-token',
          siteId,
          driveId,
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          siteId: 'invalid-siteId',
          driveId,
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          siteId,
          driveId: 'invalid-driveId',
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          siteId,
          driveId,
          itemId: 'invalid-itemId',
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the permissionId is invalid', async () => {
      await expect(
        getPermissionsConnector.deleteItemPermission({
          token: validToken,
          siteId,
          driveId,
          itemId,
          permissionId: 'invalid-permission-id',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('revokeUserFromLinkPermission', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.post(
          'https://graph.microsoft.com/beta/sites/:siteId/drives/:driveId/items/:itemId/permissions/:permissionId/revokeGrants',
          async ({ request, params }) => {
            const body = await request.json();
            const parseResult = dataSchema.safeParse(body);

            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId ||
              params.permissionId !== permissionId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            } else if (!parseResult.success) {
              return new Response(undefined, { status: 500 });
            }

            return Response.json({ status: 200 });
          }
        )
      );
    });

    test('should resolves when the token and data is valid', () => {
      expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: validToken,
          siteId,
          driveId,
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).resolves;
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: 'invalid-token',
          siteId,
          driveId,
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: validToken,
          siteId: 'invalid-siteId',
          driveId,
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: validToken,
          siteId,
          driveId: 'invalid-driveId',
          itemId,
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: validToken,
          siteId,
          driveId,
          itemId: 'invalid-itemId',
          permissionId,
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the permissionId is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: validToken,
          siteId,
          driveId,
          itemId,
          permissionId: 'invalid-permission-id',
          userEmails: ['advent@ua.fm'],
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the no user emails is invalid', async () => {
      await expect(
        getPermissionsConnector.revokeUserFromLinkPermission({
          token: validToken,
          siteId,
          driveId,
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
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/items/:itemId/permissions/:permissionId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId ||
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
          siteId,
          driveId,
          itemId,
          permissionId,
        })
      ).resolves;
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: 'invalid-token',
          siteId,
          driveId,
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          siteId: 'invalid-siteId',
          driveId,
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          siteId,
          driveId: 'invalid-driveId',
          itemId,
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the itemId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          siteId,
          driveId,
          itemId: 'invalid-itemId',
          permissionId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the permissionId is invalid', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          siteId,
          driveId,
          itemId,
          permissionId: 'invalid-permission-id',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should ', async () => {
      await expect(
        getPermissionsConnector.getPermissionDetails({
          token: validToken,
          siteId,
          driveId,
          itemId,
          permissionId,
        })
      ).resolves.toStrictEqual({ ...permissions[0] });
    });
  });
});
