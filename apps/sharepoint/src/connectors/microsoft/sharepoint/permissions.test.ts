import { http } from 'msw';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import type { MicrosoftDriveItemPermissions } from './permissions';
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

const permissions: MicrosoftDriveItemPermissions[] = Array.from({ length: 5 }, (_, i) => ({
  id: `permission-id-${i}`,
  roles: ['write'],
  link: { scope: 'users' },
  grantedToV2: {
    user: {
      displayName: `some-display-name-${i}`,
      id: `some-user-id-${i}`,
      email: `some-user-email-${i}`,
    },
  },
  grantedToIdentitiesV2: [
    {
      user: {
        displayName: `some-display-name-${i}`,
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

    test('should return permissions and nextSkipToken when the data is valid and their is another page', async () => {
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

    test('should return permissions and no nextSkipToken when the data is valid and their is no other page', async () => {
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
});
