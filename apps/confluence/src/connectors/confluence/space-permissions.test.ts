/* eslint-disable @typescript-eslint/no-non-null-assertion -- test convenience */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { ConfluenceError } from './common/error';
import {
  deleteSpacePermission,
  getAllSpacePermissions,
  getSpacePermissions,
} from './space-permissions';

const accessToken = 'token-1234';
const instanceId = 'some-instance-id';
const spaceId = 'some-space-id';
const spaceKey = 'some-space-key';
const cursors = [null, 'next-cursor', 'end-cursor'];

// size is 750 because we have 3 cursors and the limit is 250
const permissions = Array.from({ length: 750 }, (_, i) => ({
  id: `permission-${i}`,
  principal: {
    type: 'user',
    id: `user-${i}`,
  },
}));

const spacePermissionsHandler = http.get<{ instanceId: string; spaceId: string }>(
  'https://api.atlassian.com/ex/confluence/:instanceId/wiki/api/v2/spaces/:spaceId/permissions',
  ({ request, params }) => {
    if (
      params.instanceId !== instanceId ||
      request.headers.get('Authorization') !== `Bearer ${accessToken}`
    ) {
      return new Response(undefined, { status: 401 });
    }

    if (params.spaceId !== spaceId) {
      return new Response(undefined, { status: 404 });
    }

    const url = new URL(request.url);
    const limitParam = Number(url.searchParams.get('limit'));
    const cursorParam = url.searchParams.get('cursor');
    const cursorIndex = cursors.indexOf(cursorParam);
    const start = cursors.indexOf(cursorParam) * limitParam;

    return Response.json({
      results: permissions.slice(start, start + limitParam),
      _links: {
        next:
          cursorIndex === cursors.length - 1
            ? undefined
            : `/some/path/?cursor=${cursors[cursorIndex + 1]}`,
        base: `http://foo.bar`,
      },
    });
  }
);

describe('space-permissions connector', () => {
  describe('getSpacePermissions', () => {
    beforeEach(() => {
      server.use(spacePermissionsHandler);
    });

    test('should return permissions and cursor when no cursor is used and their is other pages', async () => {
      await expect(
        getSpacePermissions({
          accessToken,
          instanceId,
          spaceId,
          cursor: null,
        })
      ).resolves.toStrictEqual({
        permissions: permissions.slice(0, 250),
        cursor: cursors[1],
      });
    });

    test("should return permissions and cursor when a cursor is used and it's not the end cursor", async () => {
      await expect(
        getSpacePermissions({
          accessToken,
          instanceId,
          spaceId,
          cursor: cursors[1],
        })
      ).resolves.toStrictEqual({
        permissions: permissions.slice(250, 500),
        cursor: cursors[2],
      });
    });

    test('should return permissions and a null cursor when their is no next page', async () => {
      await expect(
        getSpacePermissions({
          accessToken,
          instanceId,
          spaceId,
          cursor: cursors[2],
        })
      ).resolves.toStrictEqual({
        permissions: permissions.slice(500, 750),
        cursor: null,
      });
    });

    test('should throw when space does not exists', async () => {
      await expect(
        getSpacePermissions({
          accessToken,
          instanceId,
          spaceId: 'wrong-space-id',
          cursor: null,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getSpacePermissions({
          accessToken: 'wrong-token',
          instanceId,
          spaceId,
          cursor: null,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getSpacePermissions({
          accessToken,
          instanceId: 'wrong-instance-id',
          spaceId,
          cursor: null,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('deleteSpacePermission', () => {
    beforeEach(() => {
      server.use(
        http.delete<{
          instanceId: string;
          spaceKey: string;
          id: string;
        }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/rest/api/space/:spaceKey/permission/:id',
          ({ request, params }) => {
            if (
              params.instanceId !== instanceId ||
              request.headers.get('Authorization') !== `Bearer ${accessToken}`
            ) {
              return new Response(undefined, { status: 401 });
            }

            if (
              params.spaceKey !== spaceKey &&
              !permissions.some((permission) => permission.id !== params.id)
            ) {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 204 });
          }
        )
      );
    });

    test('should not throw when permission does exists', async () => {
      await expect(
        deleteSpacePermission({
          accessToken,
          instanceId,
          spaceKey,
          id: permissions.at(0)!.id,
        })
      ).resolves.toBeUndefined();
    });

    test('should not throw when permission does not exists', async () => {
      await expect(
        deleteSpacePermission({
          accessToken,
          instanceId,
          spaceKey,
          id: 'wrong-permission-id',
        })
      ).resolves.toBeUndefined();
    });

    test('should not throw when space does not exists', async () => {
      await expect(
        deleteSpacePermission({
          accessToken,
          instanceId,
          spaceKey: 'wrong-space-key',
          id: permissions.at(0)!.id,
        })
      ).resolves.toBeUndefined();
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        deleteSpacePermission({
          accessToken,
          instanceId: 'wrong-instance-id',
          spaceKey,
          id: permissions.at(0)!.id,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        deleteSpacePermission({
          accessToken: 'wrong-access-token',
          instanceId,
          spaceKey,
          id: permissions.at(0)!.id,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getAllSpacePermissions', () => {
    beforeEach(() => {
      server.use(spacePermissionsHandler);
    });

    test('should return all permissions', async () => {
      await expect(
        getAllSpacePermissions({
          accessToken,
          instanceId,
          spaceId,
          maxPage: 20,
        })
      ).resolves.toStrictEqual(permissions);
    });

    test('should return some permissions when the maxPage is lower than total permissions count', async () => {
      await expect(
        getAllSpacePermissions({
          accessToken,
          instanceId,
          spaceId,
          maxPage: 2,
        })
      ).resolves.toStrictEqual(permissions.slice(0, 500));
    });

    test('should throw when space does not exists', async () => {
      await expect(
        getAllSpacePermissions({
          accessToken,
          instanceId,
          spaceId: 'wrong-space-id',
          maxPage: 20,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getAllSpacePermissions({
          accessToken: 'wrong-access-token',
          instanceId,
          spaceId,
          maxPage: 20,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getAllSpacePermissions({
          accessToken,
          instanceId: 'wrong-instance-id',
          spaceId,
          maxPage: 20,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });
});
