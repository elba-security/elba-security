import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { getDrives, type MicrosoftDrive } from './drives';

const validToken = 'token-1234';
const startSkipToken = 'start-skip-token';
const endSkipToken = 'end-skip-token';
const nextSkipToken = 'next-skip-token';

const siteId = 'some-site-id';

const drives: MicrosoftDrive[] = Array.from({ length: env.SITES_SYNC_BATCH_SIZE }, (_, i) => ({
  id: `drive-id-${i}`,
}));

describe('drives connector', () => {
  describe('getDrives', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/sites/:siteId/drives`, ({ request, params }) => {
          if (
            request.headers.get('Authorization') !== `Bearer ${validToken}` ||
            params.siteId !== siteId
          ) {
            return new Response(undefined, { status: 401 });
          }
          const url = new URL(request.url);
          const select = url.searchParams.get('$select');
          const top = url.searchParams.get('$top');
          const skipToken = url.searchParams.get('$skiptoken');

          const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftDrive)[]);

          const formatedDrives = drives.map((site) =>
            selectedKeys.reduce<Partial<MicrosoftDrive>>((acc, key: keyof MicrosoftDrive) => {
              acc[key] = site[key];
              return acc;
            }, {})
          );

          const nextPageUrl = new URL(url);
          nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

          return Response.json({
            '@odata.nextLink':
              skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
            value: formatedDrives.slice(0, top ? Number(top) : 0),
          });
        })
      );
    });

    test('should return drives and nextSkipToken when the token is valid and their is another page', async () => {
      await expect(
        getDrives({ token: validToken, siteId, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        drives,
        nextSkipToken,
      });
    });

    test('should return drives and no nextSkipToken when the token is valid and their is no other page', async () => {
      await expect(
        getDrives({ token: validToken, siteId, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        drives,
        nextSkipToken: null,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getDrives({ token: 'invalid-token', siteId, skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throws when the siteId is invalid', async () => {
      await expect(
        getDrives({ token: validToken, siteId: 'invalid-siteId', skipToken: endSkipToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
