import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ConfluenceError } from './common/error';
import { deletePageUserOperationRestriction, getPageRestrictions } from './page-restrictions';

const accessToken = 'token-1234';
const instanceId = 'some-instance-id';
const pageId = 'some-page-id';

const pageRestrictions = [
  {
    operation: 'read',
    restrictions: {
      user: {
        results: Array.from({ length: 10 }).map((_, i) => ({
          accountId: `account-id-${i}`,
          accountType: 'atlassian',
          publicName: `foo bar ${i}`,
          displayName: null,
        })),
      },
    },
  },
  {
    operation: 'write',
    restrictions: {
      user: {
        results: Array.from({ length: 10 }).map((_, i) => ({
          accountId: `account-id-${i}`,
          accountType: 'atlassian',
          publicName: `foo bar ${i}`,
          displayName: null,
        })),
      },
    },
  },
];

const pageUserRestrictions: Record<string, { read: string[]; update: string[] }> = {
  [pageId]: {
    read: ['user-1'],
    update: ['user-2'],
  },
};

describe('page-restrictions connector', () => {
  describe('getPageRestrictions', () => {
    beforeEach(() => {
      server.use(
        http.get<{ instanceId: string; pageId: string }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/rest/api/content/:pageId/restriction',
          ({ request, params }) => {
            if (
              params.instanceId !== instanceId ||
              params.pageId !== pageId ||
              request.headers.get('Authorization') !== `Bearer ${accessToken}`
            ) {
              return new Response(undefined, { status: 401 });
            }

            return Response.json({
              start: 0,
              limit: 250,
              size: 1000,
              results: pageRestrictions,
              _links: {
                next: 'nextLink',
              },
            });
          }
        )
      );
    });

    test('should return page restrictions', async () => {
      await expect(
        getPageRestrictions({
          accessToken,
          instanceId,
          pageId,
        })
      ).resolves.toStrictEqual(pageRestrictions);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getPageRestrictions({
          accessToken,
          instanceId: 'wrong-instance-id',
          pageId,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getPageRestrictions({
          accessToken: 'invalid-access-token',
          instanceId,
          pageId,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('deletePageUserOperationRestriction', () => {
    beforeEach(() => {
      server.use(
        http.delete<{
          instanceId: string;
          pageId: string;
          operationKey: 'read' | 'update';
        }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/rest/api/content/:pageId/restriction/byOperation/:operationKey/user',
          ({ request, params }) => {
            const url = new URL(request.url);
            if (
              params.instanceId !== instanceId ||
              request.headers.get('Authorization') !== `Bearer ${accessToken}`
            ) {
              return new Response(undefined, { status: 401 });
            }

            const accountId = url.searchParams.get('accountId');
            if (!accountId) {
              return new Response(undefined, { status: 400 });
            }

            const restrictions = pageUserRestrictions[params.pageId];
            const restrictionsOperationUserIds = restrictions?.[params.operationKey];

            if (!restrictions || !restrictionsOperationUserIds?.includes(accountId)) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 204 });
          }
        )
      );
    });

    test('should not throw when retriction does exists', async () => {
      await expect(
        deletePageUserOperationRestriction({
          accessToken,
          instanceId,
          pageId,
          userId: 'user-1',
          operationKey: 'read',
        })
      ).resolves.toBeUndefined();
    });

    test('should not throw when restriction does not exists', async () => {
      await expect(
        deletePageUserOperationRestriction({
          accessToken,
          instanceId,
          pageId,
          userId: 'user-1',
          operationKey: 'update',
        })
      ).resolves.toBeUndefined();
    });

    test('should not throw when page does not exists', async () => {
      await expect(
        deletePageUserOperationRestriction({
          accessToken,
          instanceId,
          pageId: 'foo-bar',
          userId: 'user-1',
          operationKey: 'read',
        })
      ).resolves.toBeUndefined();
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        deletePageUserOperationRestriction({
          accessToken,
          instanceId: 'wrong-instance-id',
          pageId: 'foo-bar',
          userId: 'user-1',
          operationKey: 'read',
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        deletePageUserOperationRestriction({
          accessToken: 'foo-bar',
          instanceId,
          pageId: 'foo-bar',
          userId: 'user-1',
          operationKey: 'read',
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });
});
