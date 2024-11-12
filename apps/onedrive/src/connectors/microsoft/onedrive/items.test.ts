import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { type MicrosoftDriveItem, getItem, getItems } from './items';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const userId = 'some-user-id';
const folderId = 'some-folder-id';
const itemId = 'some-item-id';

const item: MicrosoftDriveItem = {
  id: itemId,
  name: `item-name-1`,
  webUrl: `http://webUrl-1.somedomain.net`,
  createdBy: {
    user: {
      id: `some-user-id-1`,
    },
  },
  lastModifiedDateTime: '2024-02-23T15:50:09Z',
  parentReference: {
    id: `some-parent-id-1`,
  },
};

const items: MicrosoftDriveItem[] = Array.from({ length: 5 }, (_, i) => ({
  id: `item-id-${i}`,
  name: `item-name-${i}`,
  webUrl: `http://webUrl-${i}.somedomain.net`,
  createdBy: {
    user: {
      id: `some-user-id-${i}`,
    },
  },
  lastModifiedDateTime: `2016-03-21T20:01:${i}Z`,
  folder: { childCount: i },
  parentReference: {
    id: `some-parent-id-${i}`,
  },
}));

describe('items connector', () => {
  describe('getItem', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/users/:userId/drive/items/:itemId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            }
            const url = new URL(request.url);

            const select = url.searchParams.get('$select');

            const selectedKeys =
              select?.split(',') || ([] as unknown as (keyof MicrosoftDriveItem)[]);

            const formattedItem = selectedKeys.reduce<Partial<MicrosoftDriveItem>>(
              (acc, key: keyof MicrosoftDriveItem) => {
                return { ...acc, [key]: item[key] };
              },
              {}
            );

            return Response.json(formattedItem);
          }
        )
      );
    });

    test('should return item when the token and data is valid', async () => {
      await expect(getItem({ token: validToken, userId, itemId })).resolves.toStrictEqual(item);
    });

    test('should throws when the token is invalid', async () => {
      await expect(getItem({ token: 'invalid-token', userId, itemId })).rejects.toBeInstanceOf(
        MicrosoftError
      );
    });

    test('should throws when the userId is invalid', async () => {
      await expect(
        getItem({
          token: validToken,
          userId: 'invalid-userId',
          itemId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should return "null" when the itemId is invalid', async () => {
      await expect(
        getItem({
          token: validToken,
          userId,
          itemId: 'invalid-itemId',
        })
      ).resolves.toStrictEqual(null);
    });
  });

  describe('getItems', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/users/:userId/drive/root/children`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId
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
          `${env.MICROSOFT_API_URL}/users/:userId/drive/items/:folderId/children`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.userId !== userId ||
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

    test('should return items and nextSkipToken when the token is valid and there is another page', async () => {
      await expect(
        getItems({ token: validToken, userId, folderId: null, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        items,
        nextSkipToken,
      });
    });

    test('should return items and no nextSkipToken when the token is valid and there is no other page', async () => {
      await expect(
        getItems({ token: validToken, userId, folderId, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        items,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getItems({ token: 'invalid-token', userId, folderId, skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the userId is invalid', async () => {
      await expect(
        getItems({
          token: validToken,
          userId: 'invalid-userId',
          folderId,
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the folderId is invalid', async () => {
      await expect(
        getItems({
          token: validToken,
          userId,
          folderId: 'invalid-folderId',
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
