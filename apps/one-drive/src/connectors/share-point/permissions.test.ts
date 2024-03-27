import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import { server } from '../../../vitest/setup-msw-handlers';
import { MicrosoftError } from '../../common/error';
import type { MicrosoftDriveItemPermissions } from './permissions';
import { getItemPermissions } from './permissions';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const itemId = 'some-item-id';

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

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
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
});
