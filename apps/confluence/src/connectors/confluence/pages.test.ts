/* eslint-disable @typescript-eslint/no-non-null-assertion -- test convenience  */

import { http } from 'msw';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ConfluenceError } from './common/error';
import { getPage, getPages, getPagesWithRestrictions } from './pages';
import * as pageRestrictionsConnector from './page-restrictions';

const accessToken = 'token-1234';
const instanceId = 'some-instance-id';
const endCursor = 'end-cursor';
const nextCursor = 'next-cursor';

const pages = Array.from({ length: 100 }, (_, i) => ({
  id: `page-id-${i}`,
  title: `page title ${i}`,
  _links: {
    webui: `https://foo.bar/${i}`,
  },
  spaceId: `space-id`,
  ownerId: `owner-id`,
}));

const pagesHandler = http.get<{ instanceId: string }>(
  'https://api.atlassian.com/ex/confluence/:instanceId/wiki/api/v2/pages',
  ({ request, params }) => {
    if (
      params.instanceId !== instanceId ||
      request.headers.get('Authorization') !== `Bearer ${accessToken}`
    ) {
      return new Response(undefined, { status: 401 });
    }
    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit'));
    const cursorParam = url.searchParams.get('cursor');
    const limit = Number.isNaN(limitParam) ? 20 : limitParam;
    const start = cursorParam === nextCursor ? 20 : 0;

    return Response.json({
      results: pages.slice(start, start + limit),
      _links: {
        next: cursorParam === endCursor ? undefined : `/some/path/?cursor=${nextCursor}`,
        base: `http://foo.bar`,
      },
    });
  }
);

describe('pages connector', () => {
  describe('getPages', () => {
    beforeEach(() => {
      server.use(pagesHandler);
    });

    test('should return pages and cursor when no cursor is used and their is other pages', async () => {
      await expect(
        getPages({
          accessToken,
          instanceId,
          cursor: null,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        pages: pages.slice(0, 10),
        cursor: nextCursor,
      });
    });

    test("should return pages and cursor when a cursor is used and it's not the end cursor", async () => {
      await expect(
        getPages({
          accessToken,
          instanceId,
          cursor: nextCursor,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        pages: pages.slice(20, 30),
        cursor: nextCursor,
      });
    });

    test('should return pages and a null cursor when their is no next pages', async () => {
      await expect(
        getPages({
          accessToken,
          instanceId,
          cursor: endCursor,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        pages: pages.slice(0, 10),
        cursor: null,
      });
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getPages({
          accessToken: 'wrong-token',
          instanceId,
          cursor: endCursor,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getPages({
          accessToken,
          instanceId: 'wrong-instance-id',
          cursor: endCursor,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getPage', () => {
    beforeEach(() => {
      server.use(
        http.get<{ instanceId: string; pageId: string }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/api/v2/pages/:pageId',
          ({ request, params }) => {
            if (
              params.instanceId !== instanceId ||
              request.headers.get('Authorization') !== `Bearer ${accessToken}`
            ) {
              return new Response(undefined, { status: 401 });
            }
            const page = pages.find(({ id }) => id === params.pageId);

            if (!page) {
              return new Response(undefined, { status: 404 });
            }

            return Response.json(page);
          }
        )
      );
    });

    test('should return page when page exists', async () => {
      await expect(
        getPage({
          accessToken,
          instanceId,
          id: 'page-id-10',
        })
      ).resolves.toStrictEqual(pages[10]);
    });

    test('should return null when page does not exists', async () => {
      await expect(
        getPage({
          accessToken,
          instanceId,
          id: 'wrong-page',
        })
      ).resolves.toBe(null);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getPage({
          accessToken: 'wrong-access-token',
          instanceId,
          id: 'wrong-page',
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getPage({
          accessToken,
          instanceId: 'wrong-instance-id',
          id: 'wrong-page',
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getPagesWithRestrictions', () => {
    beforeEach(() => {
      server.use(pagesHandler);
    });

    test('should return pages and cursor when no cursor is used and their is other pages', async () => {
      vi.spyOn(pageRestrictionsConnector, 'getPageRestrictions').mockResolvedValue([]);
      const expectedPages = pages.slice(0, 20).map((page) => ({ ...page, restrictions: [] }));
      await expect(
        getPagesWithRestrictions({
          accessToken,
          instanceId,
          cursor: null,
          limit: 20,
        })
      ).resolves.toStrictEqual({
        pages: expectedPages,
        cursor: nextCursor,
      });
      expect(pageRestrictionsConnector.getPageRestrictions).toBeCalledTimes(20);
      for (let i = 0; i < expectedPages.length; i++) {
        expect(pageRestrictionsConnector.getPageRestrictions).toHaveBeenNthCalledWith(i + 1, {
          accessToken,
          instanceId,
          pageId: expectedPages.at(i)!.id,
        });
      }
    });

    test("should return pages and cursor when a cursor is used and it's not the end cursor", async () => {
      vi.spyOn(pageRestrictionsConnector, 'getPageRestrictions').mockResolvedValue([]);

      const expectedPages = pages.slice(20, 30).map((page) => ({ ...page, restrictions: [] }));
      await expect(
        getPagesWithRestrictions({
          accessToken,
          instanceId,
          cursor: nextCursor,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        pages: expectedPages,
        cursor: nextCursor,
      });

      expect(pageRestrictionsConnector.getPageRestrictions).toBeCalledTimes(expectedPages.length);
      for (let i = 0; i < expectedPages.length; i++) {
        expect(pageRestrictionsConnector.getPageRestrictions).toHaveBeenNthCalledWith(i + 1, {
          accessToken,
          instanceId,
          pageId: expectedPages.at(i)!.id,
        });
      }
    });

    test('should return pages and a null cursor when their is no next pages', async () => {
      vi.spyOn(pageRestrictionsConnector, 'getPageRestrictions').mockResolvedValue([]);

      const expectedPages = pages.slice(0, 10).map((page) => ({ ...page, restrictions: [] }));
      await expect(
        getPagesWithRestrictions({
          accessToken,
          instanceId,
          cursor: endCursor,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        pages: expectedPages,
        cursor: null,
      });

      expect(pageRestrictionsConnector.getPageRestrictions).toBeCalledTimes(expectedPages.length);
      for (let i = 0; i < expectedPages.length; i++) {
        expect(pageRestrictionsConnector.getPageRestrictions).toHaveBeenNthCalledWith(i + 1, {
          accessToken,
          instanceId,
          pageId: expectedPages.at(i)!.id,
        });
      }
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getPagesWithRestrictions({
          accessToken: 'wrong-token',
          instanceId,
          cursor: endCursor,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getPagesWithRestrictions({
          accessToken,
          instanceId: 'wrong-instance-id',
          cursor: endCursor,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });
});
