import { http } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';
import { getLinkedApps, getMemberLinkedApps, revokeMemberLinkedApp } from './apps';

const validToken = 'valid-access-token';
const teamMemberId = 'team-member-id';
const appId = 'app-id';

const linkedApps = {
  apps: [
    {
      team_member_id: 'team-member-id-1',
      linked_api_apps: [
        {
          app_id: 'app-id-1',
          app_name: 'app-name-1',
          linked: 'linked',
          publisher: 'publisher-1',
          publisher_url: 'https://publisher-url-1.com',
        },
        {
          app_id: 'app-id-2',
          app_name: 'app-name-2',
          linked: 'linked',
          publisher: 'publisher-2',
          publisher_url: 'https://publisher-url-2.com',
        },
      ],
    },
  ],
  has_more: true,
  cursor: 'cursor-1',
};

const linkedAppsNextPage = {
  apps: [
    {
      team_member_id: 'team-member-id-2',
      linked_api_apps: [
        {
          app_id: 'app-id-3',
          app_name: 'app-name-3',
          linked: 'linked',
          publisher: 'publisher-3',
          publisher_url: 'https://publisher-url-3.com',
        },
        {
          app_id: 'app-id-4',
          app_name: 'app-name-4',
          linked: 'linked',
          publisher: 'publisher-4',
          publisher_url: 'https://publisher-url-3.com',
        },
      ],
    },
  ],
  has_more: false,
};

const memberLinkedApps = [
  {
    app_id: 'app-id-1',
    app_name: 'app-name-1',
    linked: 'linked',
    publisher: 'publisher-1',
    publisher_url: 'https://publisher-url-1.com',
  },
  {
    app_id: 'app-id-2',
    app_name: 'app-name-2',
    linked: 'linked',
    publisher: 'publisher-2',
    publisher_url: 'https://publisher-url-2.com',
  },
];

describe('getLinkedApps', () => {
  beforeEach(() => {
    server.use(
      http.post(
        `${env.DROPBOX_API_BASE_URL}/2/team/linked_apps/list_members_linked_apps`,
        async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          if (request.body) {
            const actualBody = (await request.json()) as {
              cursor: string;
            };
            if (actualBody.cursor === 'cursor-1') {
              return Response.json(linkedAppsNextPage);
            }
          }

          return Response.json(linkedApps);
        }
      )
    );
  });

  test('should return the linked apps, with next page cursor', async () => {
    await expect(getLinkedApps({ accessToken: validToken, cursor: null })).resolves.toStrictEqual({
      apps: linkedApps.apps,
      nextCursor: linkedApps.cursor,
    });
  });

  test('should return the next page linked apps when the next page cursor is passed', async () => {
    await expect(
      getLinkedApps({ accessToken: validToken, cursor: 'cursor-1' })
    ).resolves.toStrictEqual({
      apps: linkedAppsNextPage.apps,
      nextCursor: null,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(getLinkedApps({ accessToken: 'foo-bar', cursor: null })).rejects.toBeInstanceOf(
      DropboxError
    );
  });
});

describe('getMemberLinkedApps', () => {
  beforeEach(() => {
    server.use(
      http.post(
        `${env.DROPBOX_API_BASE_URL}/2/team/linked_apps/list_member_linked_apps`,
        async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const body = (await request.json()) as { team_member_id: string };

          if (body.team_member_id === 'team-member-id-1') {
            return new Response(undefined, { status: 404 });
          }

          return Response.json({
            linked_api_apps: memberLinkedApps,
          });
        }
      )
    );
  });

  test('should return the member linked apps', async () => {
    await expect(
      getMemberLinkedApps({ accessToken: validToken, teamMemberId })
    ).resolves.toStrictEqual({
      apps: memberLinkedApps,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      getMemberLinkedApps({ accessToken: 'foo-bar', teamMemberId })
    ).rejects.toBeInstanceOf(DropboxError);
  });
});

describe('revokeMemberLinkedApp', () => {
  beforeEach(() => {
    server.use(
      http.post(
        `${env.DROPBOX_API_BASE_URL}/2/team/linked_apps/revoke_linked_app`,
        async ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          const body = (await request.json()) as { app_id: string; team_member_id: string };

          if (body.team_member_id === 'team-member-id-1') {
            return new Response(undefined, { status: 404 });
          }

          return Response.json({
            linked_api_apps: memberLinkedApps,
          });
        }
      )
    );
  });

  test('should revoke the member app', () => {
    expect(revokeMemberLinkedApp({ accessToken: validToken, teamMemberId, appId })).resolves
      .toBeUndefined;
  });

  test('should throws when the token is invalid', async () => {
    await expect(
      revokeMemberLinkedApp({ accessToken: 'foo-bar', teamMemberId, appId })
    ).rejects.toBeInstanceOf(DropboxError);
  });
});
