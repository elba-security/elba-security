/* eslint-disable @typescript-eslint/no-non-null-assertion -- test convenience */
/* eslint-disable @typescript-eslint/no-unsafe-call -- test convenience */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test convenience */
import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { getGroupIds, getGroupMembers } from './groups';
import { ConfluenceError } from './common/error';

const accessToken = 'token-1234';
const instanceId = 'some-instance-id';

const groups = Array.from({ length: 100 }, (_, i) => ({
  id: `group-${i}`,
}));

const firstGroupMembers = Array.from({ length: 100 }, (_, i) => ({
  accountId: `group-${i}`,
  accountType: 'atlassian',
  email: null,
  publicName: `foo-bar-${i}`,
  displayName: null,
}));

describe('groups connector', () => {
  describe('getGroupIds', () => {
    beforeEach(() => {
      server.use(
        http.get<{ instanceId: string }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/rest/api/group',
          ({ request, params }) => {
            if (
              params.instanceId !== instanceId ||
              request.headers.get('Authorization') !== `Bearer ${accessToken}`
            ) {
              return new Response(undefined, { status: 401 });
            }
            const url = new URL(request.url);
            const limitParam = Number(url.searchParams.get('limit'));
            const startParam = Number(url.searchParams.get('start'));
            const chunk = groups.slice(startParam, startParam + limitParam);

            return Response.json({
              start: startParam,
              limit: limitParam,
              size: chunk.length,
              results: chunk,
              _links: {
                next: startParam + limitParam <= groups.length ? 'nextLink' : undefined,
              },
            });
          }
        )
      );
    });

    test('should return groups ids and cursor when their is another page', async () => {
      await expect(
        getGroupIds({
          accessToken,
          instanceId,
          cursor: 10,
          limit: 10,
        })
      ).resolves.toStrictEqual({
        cursor: 20,
        groupIds: groups.slice(10, 20).map(({ id }) => id),
      });
    });

    test('should return groups ids and cursor=null when their is no other page', async () => {
      await expect(
        getGroupIds({
          accessToken,
          instanceId,
          cursor: 90,
          limit: 20,
        })
      ).resolves.toStrictEqual({
        cursor: null,
        groupIds: groups.slice(90, 100).map(({ id }) => id),
      });
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getGroupIds({
          accessToken,
          instanceId: 'wrong-instance-id',
          cursor: 90,
          limit: 20,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getGroupIds({
          accessToken: 'invalid-access-token',
          instanceId,
          cursor: 90,
          limit: 20,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });

  describe('getGroupMembers', () => {
    beforeEach(() => {
      server.use(
        http.get<{ instanceId: string; groupId: string }>(
          'https://api.atlassian.com/ex/confluence/:instanceId/wiki/rest/api/group/:groupId/membersByGroupId',
          ({ request, params }) => {
            if (
              params.instanceId !== instanceId ||
              request.headers.get('Authorization') !== `Bearer ${accessToken}`
            ) {
              return new Response(undefined, { status: 401 });
            }
            const url = new URL(request.url);
            const limit = 10;
            const startParam = Number(url.searchParams.get('start'));

            if (params.groupId !== groups[0]?.id) {
              return Response.json({
                start: startParam,
                limit,
                size: 0,
                results: [],
                _links: {},
              });
            }

            const chunk = firstGroupMembers.slice(startParam, startParam + limit);
            return Response.json({
              start: startParam,
              limit,
              size: chunk.length,
              results: chunk,
              _links: {
                next: startParam + limit <= groups.length ? 'nextLink' : undefined,
              },
            });
          }
        )
      );
    });

    test('should return group members and cursor when their is another page', async () => {
      await expect(
        getGroupMembers({
          accessToken,
          instanceId,
          cursor: 10,
          groupId: groups[0]!.id,
        })
      ).resolves.toStrictEqual({
        cursor: 20,
        members: firstGroupMembers.slice(10, 20),
      });
    });

    test('should return group members and cursor=null when their is no other page', async () => {
      await expect(
        getGroupMembers({
          accessToken,
          instanceId,
          cursor: 95,
          groupId: groups[0]!.id,
        })
      ).resolves.toStrictEqual({
        cursor: null,
        members: firstGroupMembers.slice(95, 100),
      });
    });

    test('should return group members and cursor=null when the group is empty', async () => {
      await expect(
        getGroupMembers({
          accessToken,
          instanceId,
          cursor: 0,
          groupId: groups[1]!.id,
        })
      ).resolves.toStrictEqual({
        cursor: null,
        members: [],
      });
    });

    test('should throw when the instance id is invalid', async () => {
      await expect(
        getGroupMembers({
          accessToken,
          instanceId: 'wrong-instance-id',
          cursor: 90,
          groupId: groups[0]!.id,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });

    test('should throw when the access token is invalid', async () => {
      await expect(
        getGroupMembers({
          accessToken: 'invalid-access-token',
          instanceId,
          cursor: 90,
          groupId: groups[0]!.id,
        })
      ).rejects.toBeInstanceOf(ConfluenceError);
    });
  });
});
