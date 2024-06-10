import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { type MicrosoftDriveItem } from './items';
import { getItem } from './item';

const validToken = 'token-1234';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const itemId = 'some-item-id';

const item: MicrosoftDriveItem = {
  id: itemId,
  name: `item-name-1`,
  webUrl: `http://webUrl-1.somedomain.net`,
  createdBy: {
    user: {
      displayName: `some-display-name-1`,
      id: `some-user-id-1`,
      email: `some-user-email-1`,
    },
  },
  lastModifiedDateTime: '2024-02-23T15:50:09Z',
  parentReference: {
    id: `some-parent-id-1`,
  },
};

describe('get-item connector', () => {
  describe('getItems', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/items/:itemId`,
          ({ request, params }) => {
            if (
              request.headers.get('Authorization') !== `Bearer ${validToken}` ||
              params.siteId !== siteId ||
              params.driveId !== driveId
            ) {
              return new Response(undefined, { status: 401 });
            } else if (params.itemId !== itemId) {
              return new Response(undefined, { status: 404 });
            }
            const url = new URL(request.url);

            const select = url.searchParams.get('$select');

            const selectedKeys =
              select?.split(',') || ([] as unknown as (keyof MicrosoftDriveItem)[]);

            const formatedItem = selectedKeys.reduce<Partial<MicrosoftDriveItem>>(
              (acc, key: keyof MicrosoftDriveItem) => {
                acc[key] = item[key];
                return acc;
              },
              {}
            );

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
            return Response.json(formatedItem);
          }
        )
      );
    });

    test('should return item when the token and data is valid', async () => {
      await expect(getItem({ token: validToken, siteId, driveId, itemId })).resolves.toStrictEqual(
        item
      );
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getItem({ token: 'invalid-token', siteId, driveId, itemId })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getItem({
          token: validToken,
          siteId: 'invalid-siteId',
          driveId,
          itemId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getItem({
          token: validToken,
          siteId,
          driveId: 'invalid-driveId',
          itemId,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should return "null" when the itemId is invalid', async () => {
      await expect(
        getItem({
          token: validToken,
          siteId,
          driveId,
          itemId: 'invalid-itemId',
        })
      ).resolves.toStrictEqual(null);
    });
  });
});
