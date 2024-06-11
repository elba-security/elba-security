import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { type MicrosoftDriveItem, getItems } from './items';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const folderId = 'some-folder-id';

const items: MicrosoftDriveItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `item-id-${i}`,
  name: `item-name-${i}`,
  webUrl: `http://webUrl-${i}.somedomain.net`,
  createdBy: {
    user: {
      displayName: `some-display-name-${i}`,
      id: `some-user-id-${i}`,
      email: `some-user-email-${i}`,
    },
  },
  lastModifiedDateTime: `2016-03-21T20:01:${i}Z`,
  folder: { childCount: i },
  parentReference: {
    id: `some-parent-id-${i}`,
  },
}));

describe('items connector', () => {
  describe('getItems', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/root/children`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId
            ) {
              return new Response(undefined, { status: 401 });
            }
            const url = new URL(request.url);

            const select = url.searchParams.get('$select');
            const top = url.searchParams.get('$top');
            const skipToken = url.searchParams.get('$skiptoken');

            const selectedKeys =
              select?.split(',') || ([] as unknown as (keyof MicrosoftDriveItem)[]);

            const formattedItems = items.map((site) =>
              selectedKeys.reduce<Partial<MicrosoftDriveItem>>(
                (acc, key: keyof MicrosoftDriveItem) => {
                  return { ...acc, [key]: site[key] };
                },
                {}
              )
            );

            const nextPageUrl = new URL(url);
            nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

            return Response.json({
              '@odata.nextLink':
                skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
              value: formattedItems.slice(0, top ? Number(top) : 0),
            });
          }
        ),
        http.get(
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/items/:folderId/children`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId ||
              params.folderId !== folderId
            ) {
              return new Response(undefined, { status: 401 });
            }
            const url = new URL(request.url);

            const select = url.searchParams.get('$select');
            const top = url.searchParams.get('$top');
            const skipToken = url.searchParams.get('$skiptoken');

            const selectedKeys =
              select?.split(',') || ([] as unknown as (keyof MicrosoftDriveItem)[]);

            const formattedItems = items.map((site) =>
              selectedKeys.reduce<Partial<MicrosoftDriveItem>>(
                (acc, key: keyof MicrosoftDriveItem) => {
                  return { ...acc, [key]: site[key] };
                },
                {}
              )
            );

            const nextPageUrl = new URL(url);
            nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

            return Response.json({
              '@odata.nextLink':
                skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
              value: formattedItems.slice(0, top ? Number(top) : 0),
            });
          }
        )
      );
    });

    test('should return items and nextSkipToken when the token is valid and their is another page', async () => {
      await expect(
        getItems({ token: validToken, siteId, driveId, folderId: null, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        items,
        nextSkipToken,
      });
    });

    test('should return items and no nextSkipToken when the token is valid and their is no other page', async () => {
      await expect(
        getItems({ token: validToken, siteId, driveId, folderId, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        items,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getItems({ token: 'invalid-token', siteId, driveId, folderId, skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getItems({
          token: validToken,
          siteId: 'invalid-siteId',
          driveId,
          folderId,
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getItems({
          token: validToken,
          siteId,
          driveId: 'invalid-siteId',
          folderId,
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the folderId is invalid', async () => {
      await expect(
        getItems({
          token: validToken,
          siteId,
          driveId,
          folderId: 'invalid-siteId',
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
