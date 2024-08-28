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

const drives: MicrosoftDrive[] = [{ id: 'drive-id-1' }, { id: 'drive-id-2' }];

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
          const top = url.searchParams.get('$top');
          const skipToken = url.searchParams.get('$skiptoken');
          const nextPageUrl = new URL(url);
          nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);

          return Response.json({
            '@odata.nextLink':
              skipToken === endSkipToken ? null : decodeURIComponent(nextPageUrl.toString()),
            value: drives.slice(0, top ? Number(top) : 0),
          });
        })
      );
    });

    test('should return drives and nextSkipToken when the token is valid and there is another page', async () => {
      await expect(
        getDrives({ token: validToken, siteId, skipToken: startSkipToken })
      ).resolves.toStrictEqual({
        driveIds: drives.map(({ id }) => id),
        nextSkipToken,
      });
    });

    test('should return drives and no nextSkipToken when the token is valid and there is no other page', async () => {
      await expect(
        getDrives({ token: validToken, siteId, skipToken: endSkipToken })
      ).resolves.toStrictEqual({
        driveIds: drives.map(({ id }) => id),
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
