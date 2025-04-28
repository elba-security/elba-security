import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils/vitest/setup-msw-handlers';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { type DeltaUser, getDeltaItems, type DeltaItem, getDeltaUsers } from './delta';

const userId = 'some-user-id';

const tenantId = 'tenant-id';

const validToken = 'token-1234';
const nextDeltaToken = 'some-delta-token';

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

const deltaUsers: DeltaUser[] = Array.from({ length: 2 }, (_, i) => ({
  id: `user-id-${i}`,
  ...(i === 0
    ? { '@removed': { reason: 'changed' } }
    : {
        userType: 'Member',
      }),
}));

describe('delta connector', () => {
  describe('getDeltaItems', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/users/:userId/drive/root/delta`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            if (params.userId !== userId) {
              return new Response(undefined, { status: 404 });
            }

            const url = new URL(request.url);
            const select = url.searchParams.get('$select');
            const top = url.searchParams.get('$top');
            const token = url.searchParams.get('token');

            const selectedKeys = select?.split(',') || ([] as unknown as (keyof DeltaItem)[]);

            const formattedDelta = deltaItems.map((item) =>
              selectedKeys.reduce<Partial<DeltaItem>>((acc, key: keyof DeltaItem) => {
                return { ...acc, [key]: item[key] };
              }, {})
            );

            const nextPageUrl = new URL(`${env.MICROSOFT_API_URL}/users/:userId/drive/root/delta`);
            nextPageUrl.searchParams.set(
              'token',
              token === endSkipToken ? nextDeltaToken : nextSkipToken
            );

            const addToken =
              token === endSkipToken
                ? { '@odata.deltaLink': decodeURIComponent(nextPageUrl.toString()) }
                : { '@odata.nextLink': decodeURIComponent(nextPageUrl.toString()) };

            return Response.json({
              value: formattedDelta.slice(0, Number(top)),
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
          userId,
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
          userId,
          deltaToken: endSkipToken,
        })
      ).resolves.toStrictEqual({
        items: { deleted: [deltaItems[0]?.id], updated: [deltaItems[1]] },
        newDeltaToken: nextDeltaToken,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getDeltaItems({
          token: 'invalid-token',
          userId,
          deltaToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test("should return null when the user doesn't have a drive", async () => {
      await expect(
        getDeltaItems({
          token: validToken,
          userId: 'some-invalid-id',
          deltaToken: null,
        })
      ).resolves.toBeNull();
    });
  });

  describe('getDeltaUsers', () => {
    // mock token API endpoint using msw
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/:tenantId/users/delta`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const url = new URL(request.url);
          const select = url.searchParams.get('$select');
          const skipToken = url.searchParams.get('$skiptoken');

          const selectedKeys = select?.split(',') || ([] as unknown as (keyof DeltaUser)[]);

          const formattedDelta = deltaUsers.map((user) =>
            selectedKeys.reduce<Partial<DeltaUser>>((acc, key: keyof DeltaUser) => {
              return { ...acc, [key]: user[key], '@removed': user['@removed'] };
            }, {})
          );

          const nextPageUrl = new URL(`${env.MICROSOFT_API_URL}/users/delta`);
          nextPageUrl.searchParams.delete('$deltatoken');
          nextPageUrl.searchParams.delete('$skiptoken');
          if (skipToken === endSkipToken) {
            nextPageUrl.searchParams.set('$deltatoken', nextDeltaToken);
          } else {
            nextPageUrl.searchParams.set('$skiptoken', nextSkipToken);
          }

          const addToken =
            skipToken === endSkipToken
              ? { '@odata.deltaLink': decodeURIComponent(nextPageUrl.toString()) }
              : { '@odata.nextLink': decodeURIComponent(nextPageUrl.toString()) };

          return Response.json({
            value: formattedDelta,
            ...addToken,
          });
        })
      );
    });

    test('should return delta users and nextSkipToken when there is another page', async () => {
      await expect(
        getDeltaUsers({
          tenantId,
          token: validToken,
          skipToken: startSkipToken,
        })
      ).resolves.toStrictEqual({
        users: { deleted: [deltaUsers[0]?.id], updated: [deltaUsers[1]] },
        nextSkipToken,
      });
    });

    test('should return delta users and newDeltaToken when there is no next page', async () => {
      await expect(
        getDeltaUsers({
          tenantId,
          token: validToken,
          skipToken: endSkipToken,
        })
      ).resolves.toStrictEqual({
        users: { deleted: [deltaUsers[0]?.id], updated: [deltaUsers[1]] },
        newDeltaToken: nextDeltaToken,
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(
        getDeltaUsers({
          tenantId,
          token: 'invalid-token',
          skipToken: endSkipToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
