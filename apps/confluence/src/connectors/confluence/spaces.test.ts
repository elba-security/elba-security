/* eslint-disable @typescript-eslint/no-non-null-assertion -- test convenience */
/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenience */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenience */
import { http } from 'msw';
import { describe, expect, test, beforeEach, vi } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ConfluenceError } from './common/error';
import * as spacePermissionsConnector from './space-permissions';
import { getSpace, getSpaceWithPermissions, getSpaces, getSpacesWithPermissions } from './spaces';

const accessToken = 'token-1234';
const instanceId = 'some-instance-id';
const endCursor = 'end-cursor';
const nextCursor = 'next-cursor';

const globalSpaces = Array.from({ length: 100 }, (_, i) => ({
  id: `global-space-${i}`,
  key: `global-space-key-${i}`,
  name: `global-space ${i}`,
  authorId: `global-space author ${i}`,
  type: 'global',
  _links: {
    webui: 'http://foo.bar',
  },
}));

const personalSpaces = Array.from({ length: 100 }, (_, i) => ({
  id: `personal-space-${i}`,
  key: `personal-space-key-${i}`,
  name: `personal-space ${i}`,
  authorId: `personal-pace author ${i}`,
  type: 'personal',
  _links: {
    webui: 'http://foo.bar',
  },
}));

const spacesHandler = http.get<{ instanceId: string }>(
  'https://api.atlassian.com/ex/confluence/:instanceId/wiki/api/v2/spaces',
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
    const typeParam = url.searchParams.get('type');
    const limit = Number.isNaN(limitParam) ? 20 : limitParam;
    const start = cursorParam === nextCursor ? 20 : 0;
    const spaces = typeParam === 'personal' ? personalSpaces : globalSpaces;

    return Response.json({
      results: spaces.slice(start, start + limit),
      _links: {
        next: cursorParam === endCursor ? undefined : `/some/path/?cursor=${nextCursor}`,
        base: `http://foo.bar`,
      },
    });
  }
);

const spaceHandler = http.get<{ instanceId: string; spaceId: string }>(
  'https://api.atlassian.com/ex/confluence/:instanceId/wiki/api/v2/spaces/:spaceId',
  ({ request, params }) => {
    if (
      params.instanceId !== instanceId ||
      request.headers.get('Authorization') !== `Bearer ${accessToken}`
    ) {
      return new Response(undefined, { status: 401 });
    }
    const page = [...personalSpaces, ...globalSpaces].find(({ id }) => id === params.spaceId);

    if (!page) {
      return new Response(undefined, { status: 404 });
    }

    return Response.json(page);
  }
);

describe('spaces connector', () => {
  describe('getSpaces', () => {
    beforeEach(() => {
      server.use(spacesHandler);
    });

    test('should return global spaces and cursor when no cursor is used and their is other page', async () => {
      await expect(
        getSpaces({
          accessToken,
          instanceId,
          cursor: null,
          type: 'global',
          limit: 10,
        })
      ).resolves.toStrictEqual({
        spaces: globalSpaces.slice(0, 10),
        cursor: nextCursor,
      });
    });

    test('should return personal spaces and cursor when no cursor is used and their is other page', async () => {
      await expect(
        getSpaces({
          accessToken,
          instanceId,
          cursor: null,
          type: 'personal',
          limit: 10,
        })
      ).resolves.toStrictEqual({
        spaces: personalSpaces.slice(0, 10),
        cursor: nextCursor,
      });
    });

    test("should return spaces and cursor when a cursor is used and it's not the end cursor", async () => {
      await expect(
        getSpaces({
          accessToken,
          instanceId,
          cursor: nextCursor,
          type: 'personal',
          limit: 10,
        })
      ).resolves.toStrictEqual({
        spaces: personalSpaces.slice(20, 30),
        cursor: nextCursor,
      });
    });

    test('should return spaces and a null cursor when their is no next globalSpaces', async () => {
      await expect(
        getSpaces({
          accessToken,
          instanceId,
          type: 'personal',
          cursor: endCursor,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        spaces: personalSpaces.slice(0, 10),
        cursor: null,
      });
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getSpaces({
          accessToken: 'wrong-token',
          instanceId,
          type: 'personal',
          cursor: endCursor,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getSpaces({
          accessToken,
          instanceId: 'wrong-instance-id',
          type: 'personal',
          cursor: endCursor,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getSpace', () => {
    beforeEach(() => {
      server.use(spaceHandler);
    });

    test('should return space when it exists', async () => {
      await expect(
        getSpace({
          accessToken,
          instanceId,
          id: 'personal-space-10',
        })
      ).resolves.toStrictEqual(personalSpaces[10]);
    });

    test('should return null when space does not exists', async () => {
      await expect(
        getSpace({
          accessToken,
          instanceId,
          id: 'wrong-space',
        })
      ).resolves.toBe(null);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getSpace({
          accessToken: 'wrong-access-token',
          instanceId,
          id: 'personal-space-10',
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getSpace({
          accessToken,
          instanceId: 'wrong-instance-id',
          id: 'personal-space-10',
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getSpacesWithPermissions', () => {
    beforeEach(() => {
      server.use(spacesHandler);
    });

    test('should return globalSpaces and cursor when no cursor is used and their is other globalSpaces', async () => {
      vi.spyOn(spacePermissionsConnector, 'getAllSpacePermissions').mockResolvedValue([]);
      const expectedSpaces = globalSpaces
        .slice(0, 20)
        .map((page) => ({ ...page, permissions: [] }));
      await expect(
        getSpacesWithPermissions({
          accessToken,
          instanceId,
          cursor: null,
          limit: 20,
          permissionsMaxPage: 50,
          type: 'global',
        })
      ).resolves.toStrictEqual({
        spaces: expectedSpaces,
        cursor: nextCursor,
      });
      expect(spacePermissionsConnector.getAllSpacePermissions).toBeCalledTimes(20);
      for (let i = 0; i < expectedSpaces.length; i++) {
        expect(spacePermissionsConnector.getAllSpacePermissions).toHaveBeenNthCalledWith(i + 1, {
          accessToken,
          instanceId,
          maxPage: 50,
          spaceId: expectedSpaces.at(i)!.id,
        });
      }
    });

    test("should return globalSpaces and cursor when a cursor is used and it's not the end cursor", async () => {
      vi.spyOn(spacePermissionsConnector, 'getAllSpacePermissions').mockResolvedValue([]);

      const expectedSpaces = globalSpaces
        .slice(20, 30)
        .map((page) => ({ ...page, permissions: [] }));
      await expect(
        getSpacesWithPermissions({
          accessToken,
          instanceId,
          cursor: nextCursor,
          limit: 10,
          permissionsMaxPage: 50,
          type: 'global',
        })
      ).resolves.toStrictEqual({
        spaces: expectedSpaces,
        cursor: nextCursor,
      });

      expect(spacePermissionsConnector.getAllSpacePermissions).toBeCalledTimes(
        expectedSpaces.length
      );
      for (let i = 0; i < expectedSpaces.length; i++) {
        expect(spacePermissionsConnector.getAllSpacePermissions).toHaveBeenNthCalledWith(i + 1, {
          accessToken,
          instanceId,
          maxPage: 50,
          spaceId: expectedSpaces.at(i)!.id,
        });
      }
    });

    test('should return globalSpaces and a null cursor when their is no next globalSpaces', async () => {
      vi.spyOn(spacePermissionsConnector, 'getAllSpacePermissions').mockResolvedValue([]);

      const expectedSpaces = globalSpaces
        .slice(0, 10)
        .map((page) => ({ ...page, permissions: [] }));
      await expect(
        getSpacesWithPermissions({
          accessToken,
          instanceId,
          cursor: endCursor,
          limit: 10,
          permissionsMaxPage: 50,
          type: 'global',
        })
      ).resolves.toStrictEqual({
        spaces: expectedSpaces,
        cursor: null,
      });

      expect(spacePermissionsConnector.getAllSpacePermissions).toBeCalledTimes(
        expectedSpaces.length
      );
      for (let i = 0; i < expectedSpaces.length; i++) {
        expect(spacePermissionsConnector.getAllSpacePermissions).toHaveBeenNthCalledWith(i + 1, {
          accessToken,
          instanceId,
          maxPage: 50,
          spaceId: expectedSpaces.at(i)!.id,
        });
      }
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getSpacesWithPermissions({
          accessToken: 'wrong-token',
          instanceId,
          cursor: endCursor,
          type: 'global',
          permissionsMaxPage: 50,
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getSpacesWithPermissions({
          accessToken,
          instanceId: 'wrong-instance-id',
          cursor: endCursor,
          permissionsMaxPage: 50,
          type: 'global',
          limit: 10,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getSpaceWithPermissions', () => {
    beforeEach(() => {
      server.use(spaceHandler);
    });

    test('should return space', async () => {
      vi.spyOn(spacePermissionsConnector, 'getAllSpacePermissions').mockResolvedValue([]);
      await expect(
        getSpaceWithPermissions({
          accessToken,
          instanceId,
          id: globalSpaces.at(0)!.id,
          permissionsMaxPage: 50,
        })
      ).resolves.toStrictEqual({
        ...globalSpaces.at(0),
        permissions: [],
      });
      expect(spacePermissionsConnector.getAllSpacePermissions).toBeCalledTimes(1);
      expect(spacePermissionsConnector.getAllSpacePermissions).toBeCalledWith({
        instanceId,
        accessToken,
        spaceId: globalSpaces.at(0)!.id,
        maxPage: 50,
      });
    });

    test('should return null when space does not exits', async () => {
      vi.spyOn(spacePermissionsConnector, 'getAllSpacePermissions').mockResolvedValue([]);
      await expect(
        getSpaceWithPermissions({
          accessToken,
          instanceId,
          id: 'wrong-space-id',
          permissionsMaxPage: 50,
        })
      ).resolves.toBe(null);
      expect(spacePermissionsConnector.getAllSpacePermissions).toBeCalledTimes(0);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getSpaceWithPermissions({
          accessToken: 'wrong-access-token',
          instanceId,
          id: globalSpaces.at(0)!.id,
          permissionsMaxPage: 50,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getSpaceWithPermissions({
          accessToken,
          instanceId: 'wrong-instance-id',
          id: globalSpaces.at(0)!.id,
          permissionsMaxPage: 50,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });
});
