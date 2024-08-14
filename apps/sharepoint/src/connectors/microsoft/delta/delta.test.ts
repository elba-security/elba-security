import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { getDeltaItems, type DeltaItem } from './delta';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';

const validToken = 'token-1234';
const deltaToken = 'some-delta-token';

const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const deltaItems: DeltaItem[] = Array.from({ length: 2 }, (_, i) => ({
  id: `item-id-${i}`,
  name: `item-name-${i}`,
  webUrl: `http://webUrl-1.somedomain-${i}.net`,
  createdBy: {
    user: {
      id: `some-user-id-${i}`,
    },
  },
  lastModifiedDateTime: '2024-01-01T00:00:00Z',
  parentReference: {
    id: `some-parent-id-1`,
  },
  ...(i === 0 ? { deleted: { state: 'deleted' } } : {}),
}));

describe('delta connector', () => {
  describe('getDeltaItems', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/sites/:siteId/drives/:driveId/root/delta`,
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
            const token = url.searchParams.get('token');

            const selectedKeys = select?.split(',') || ([] as unknown as (keyof DeltaItem)[]);

            const formattedDelta = deltaItems.map((site) =>
              selectedKeys.reduce<Partial<DeltaItem>>((acc, key: keyof DeltaItem) => {
                return { ...acc, [key]: site[key] };
              }, {})
            );

            const nextPageUrl = new URL(url);
            nextPageUrl.searchParams.set(
              'token',
              token === 'latest' || token === endSkipToken ? deltaToken : nextSkipToken
            );

            const addToken =
              token === endSkipToken || token === 'latest'
                ? { '@odata.deltaLink': decodeURIComponent(nextPageUrl.toString()) }
                : { '@odata.nextLink': decodeURIComponent(nextPageUrl.toString()) };

            return Response.json({
              value: formattedDelta.slice(0, token === 'latest' ? 0 : Number(top)),
              ...addToken,
            });
          }
        )
      );
    });

    test('should return delta items and nextSkipToken when there is another page', async () => {
      await expect(
        getDeltaItems({
          token: validToken,
          siteId,
          driveId,
          deltaToken: startSkipToken,
        })
      ).resolves.toStrictEqual({
        items: { deleted: [deltaItems[0]?.id], updated: [deltaItems[1]] },
        nextSkipToken,
      });
    });

    test('should return delta items and newDeltaToken when there is no next page', async () => {
      await expect(
        getDeltaItems({
          token: validToken,
          siteId,
          driveId,
          deltaToken: endSkipToken,
        })
      ).resolves.toStrictEqual({
        items: { deleted: [deltaItems[0]?.id], updated: [deltaItems[1]] },
        newDeltaToken: deltaToken,
      });
    });

    test('should return newDeltaToken and no delta items when no token is provided', async () => {
      await expect(
        getDeltaItems({
          token: validToken,
          siteId,
          driveId,
          deltaToken: null,
        })
      ).resolves.toStrictEqual({
        items: { deleted: [], updated: [] },
        newDeltaToken: deltaToken,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getDeltaItems({
          token: 'invalid-token',
          siteId,
          driveId,
          deltaToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getDeltaItems({
          token: validToken,
          siteId: 'some-invalid-id',
          driveId,
          deltaToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getDeltaItems({
          token: validToken,
          siteId,
          driveId: 'some-invalid-id',
          deltaToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
