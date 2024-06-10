import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { getDelta, type Delta } from './get-delta';

const siteId = 'some-site-id';
const driveId = 'some-drive-id';

const validToken = 'token-1234';
const deltaToken = 'some-delta-token';

const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const delta: Delta[] = Array.from({ length: 10 }, (_, i) => ({
  id: `item-id-${i}`,
  name: `item-name-${i}`,
  webUrl: `http://webUrl-1.somedomain-${i}.net`,
  createdBy: {
    user: {
      displayName: `some-display-name-${i}`,
      id: `some-user-id-${i}`,
      email: `some-user-email-${i}`,
    },
  },
  parentReference: {
    id: `some-parent-id-1`,
  },
  ...(i % 3 === 0 ? { deleted: { state: 'deleted' } } : {}),
}));

describe('delta connector', () => {
  describe('getDelta', () => {
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

            const selectedKeys = select?.split(',') || ([] as unknown as (keyof Delta)[]);

            const formatedDelta = selectedKeys.length
              ? delta.map((site) =>
                  selectedKeys.reduce<Partial<Delta>>((acc, key: keyof Delta) => {
                    acc[key] = site[key];
                    return acc;
                  }, {})
                )
              : delta;

            // const formatedDelta = selectedKeys.length && selectedKeys[0] === 'id' ? [] : delta;

            const nextPageUrl = new URL(url);
            nextPageUrl.searchParams.set(
              'token',
              token === endSkipToken ? deltaToken : nextSkipToken
            );

            const addToken =
              token === endSkipToken
                ? { '@odata.deltaLink': decodeURIComponent(nextPageUrl.toString()) }
                : { '@odata.nextLink': decodeURIComponent(nextPageUrl.toString()) };

            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call -- convenience
            return Response.json({
              value: formatedDelta.slice(0, top ? Number(top) : 0),
              ...addToken,
            });
          }
        )
      );
    });

    test('should return delta and nextSkipToken when the data is valid and their is another page', async () => {
      await expect(
        getDelta({
          token: validToken,
          siteId,
          driveId,
          isFirstSync: true,
          skipToken: startSkipToken,
          deltaToken: null,
        })
      ).resolves.toStrictEqual({
        delta: [],
        newDeltaToken: null,
        nextSkipToken,
      });
    });

    test('should return delta and no nextSkipToken and newDeltaToken when the data is valid and their is no next page', async () => {
      await expect(
        getDelta({
          token: validToken,
          siteId,
          driveId,
          isFirstSync: true,
          skipToken: endSkipToken,
          deltaToken: null,
        })
      ).resolves.toStrictEqual({
        delta: [],
        newDeltaToken: deltaToken,
        nextSkipToken: null,
      });
    });

    test('should return full delta object when data is valid and is not first sync', async () => {
      await expect(
        getDelta({
          token: validToken,
          siteId,
          driveId,
          isFirstSync: false,
          skipToken: endSkipToken,
          deltaToken: null,
        })
      ).resolves.toStrictEqual({
        delta,
        // delta: delta.map((item) => {
        //   delete item.deleted;
        //   return item;
        // }),
        newDeltaToken: deltaToken,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getDelta({
          token: 'invalid-token',
          siteId,
          driveId,
          isFirstSync: true,
          skipToken: endSkipToken,
          deltaToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getDelta({
          token: validToken,
          siteId: 'some-invalid-id',
          driveId,
          isFirstSync: true,
          skipToken: null,
          deltaToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the driveId is invalid', async () => {
      await expect(
        getDelta({
          token: validToken,
          siteId,
          driveId: 'some-invalid-id',
          isFirstSync: true,
          skipToken: null,
          deltaToken: null,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
