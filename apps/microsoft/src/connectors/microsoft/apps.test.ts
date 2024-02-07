import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../../vitest/setup-msw-handlers';
import { deleteAppPermission, getApp, getApps } from './apps';
import type { MicrosoftUser } from './users';
import { MicrosoftError } from './commons/error';
import type { MicrosoftApp } from './apps';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const tenantId = 'some-tenant-id';

const invalidApps = [
  {
    id: 'bar',
  },
];

const validApps: MicrosoftApp[] = Array.from(
  { length: env.THIRD_PARTY_APPS_SYNC_BATCH_SIZE - invalidApps.length },
  (_, i) => ({
    id: `app-id-${i}`,
    description: `description ${i}`,
    oauth2PermissionScopes: ['foo', 'bar'],
    homepage: `https://homepage.com/${i}`,
    appDisplayName: `app ${i}`,
    appRoleAssignedTo: [
      {
        id: 'permission-id',
        principalId: 'principal-id',
      },
    ],
    info: {
      logoUrl: null,
    },
    verifiedPublisher: {
      displayName: 'publisher',
    },
  })
);

const apps = [...validApps, ...invalidApps];

describe('apps connector', () => {
  describe('getApps', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/:tenantId/servicePrincipals`, ({ request, params }) => {
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

          const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftUser)[]);
          selectedKeys.push('appRoleAssignedTo');
          const formattedApps = apps.map((app) =>
            selectedKeys.reduce<Partial<MicrosoftUser>>((acc, key: keyof MicrosoftUser) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
              acc[key] = app[key];
              return acc;
            }, {})
          );

          const nextPageUrl = new URL(url);
          nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
          return Response.json({
            '@odata.nextLink':
              skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
            value: formattedApps.slice(0, top ? Number(top) : 0),
          });
        })
      );
    });

    test('should return apps and nextSkipToken when the token is valid and their is another page', async () => {
      await expect(
        getApps({ tenantId, token: validToken, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        validApps,
        invalidApps,
        nextSkipToken,
      });
    });

    test('should return apps and no nextSkipToken when the token is valid and their is no other page', async () => {
      await expect(
        getApps({ tenantId, token: validToken, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        validApps,
        invalidApps,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getApps({ tenantId, token: 'invalid-token', skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the tenantId is invalid', async () => {
      await expect(
        getApps({ tenantId: 'invalid-tenant-id', token: validToken, skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('getApp', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/:tenantId/servicePrincipals/:appId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.tenantId !== tenantId
            ) {
              return new Response(undefined, { status: 401 });
            }

            if (!params.appId) {
              return new Response(undefined, { status: 400 });
            }

            const url = new URL(request.url);
            const select = url.searchParams.get('$select');

            const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftUser)[]);
            selectedKeys.push('appRoleAssignedTo');

            const app = validApps.find(({ id }) => id === params.appId);

            if (!app) {
              return new Response(undefined, { status: 404 });
            }

            const formattedApp = selectedKeys.reduce<Partial<MicrosoftUser>>(
              (acc, key: keyof MicrosoftUser) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
                acc[key] = app[key];
                return acc;
              },
              {}
            );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
            return Response.json(formattedApp);
          }
        )
      );
    });

    test('should return null when the app does not exist', async () => {
      await expect(getApp({ tenantId, token: validToken, appId: 'foo-bar' })).resolves.toBe(null);
    });

    test('should returns app when the app does exist', async () => {
      await expect(
        getApp({ tenantId, token: validToken, appId: 'app-id-0' })
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- convenience
      ).resolves.toMatchObject(validApps.at(0)!);
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getApp({ tenantId, token: 'invalid-token', appId: 'app-id-0' })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the tenantId is invalid', async () => {
      await expect(
        getApp({ tenantId: 'invalid-tenant-id', token: validToken, appId: 'app-id-0' })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
  describe('deleteAppPermission', () => {
    beforeEach(() => {
      server.use(
        http.delete(
          `${env.MICROSOFT_API_URL}/:tenantId/servicePrincipals/:appId/appRoleAssignedTo/:permissionId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.tenantId !== tenantId
            ) {
              return new Response(undefined, { status: 401 });
            }

            if (!params.appId || !params.permissionId) {
              return new Response(undefined, { status: 400 });
            }

            const app = validApps.find(({ id }) => id === params.appId);

            if (!app) {
              return new Response(undefined, { status: 404 });
            }

            const appRoleAssignedTo = app.appRoleAssignedTo.find(
              ({ id }) => id === params.permissionId
            );

            if (!appRoleAssignedTo) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(null, { status: 204 });
          }
        )
      );
    });

    test('should return void when the app permission does not exist', async () => {
      await expect(
        deleteAppPermission({
          tenantId,
          token: validToken,
          appId: 'foo-bar',
          permissionId: 'permission-id',
        })
      ).resolves.toBe(void 0);
    });

    test('should returns void when the permission has been deleted', async () => {
      await expect(
        deleteAppPermission({
          tenantId,
          token: validToken,
          appId: 'app-id-0',
          permissionId: 'permission-id',
        })
      ).resolves.toBe(void 0);
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        deleteAppPermission({
          tenantId,
          token: 'invalid-token',
          appId: 'app-id-0',
          permissionId: 'permission-id',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the tenantId is invalid', async () => {
      await expect(
        deleteAppPermission({
          tenantId: 'invalid-tenant-id',
          token: validToken,
          appId: 'app-id-0',
          permissionId: 'permission-id',
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
