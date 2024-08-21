import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';
import { getAuthenticatedAdmin, getCurrentUserAccount, getUsers, suspendUser } from './users';

const validToken = 'token-1234';
const nextCursor = 'next-cursor-1';
const endCursor = 'end-cursor-1';
const teamMemberId = 'team-member-id';

const adminProfile = (isActive = true) => ({
  admin_profile: {
    team_member_id: 'team-member-id',
    membership_type: { '.tag': 'full' },
    status: { '.tag': isActive ? 'active' : 'suspended' },
  },
});

const currentUserAccount = {
  team: {
    id: 'team-id',
    name: 'team-name',
  },
  root_info: {
    '.tag': 'team',
    root_namespace_id: 'root-namespace-id',
  },
  team_member_id: 'team-member-id',
};

const createMembers = (startIndex = 0, length = 5) => {
  return Array.from({ length }, (_, i) => ({
    profile: {
      team_member_id: `id-${startIndex + i}`,
      name: { display_name: `name-${startIndex + i}` },
      email: `user-${startIndex + i}@alpha.com`,
      root_folder_id: `test-root-folder-id`,
      secondary_emails: [],
      status: { '.tag': 'active' },
    },
  }));
};

describe('users connector', () => {
  describe('getAuthenticatedAdmin', () => {
    const setup = ({ isActive = true }: { isActive?: boolean }) => {
      server.use(
        http.post(
          `${env.DROPBOX_API_BASE_URL}/2/team/token/get_authenticated_admin`,
          ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            return Response.json(adminProfile(isActive));
          }
        )
      );
    };

    test('should return the admin details', async () => {
      setup({});
      await expect(getAuthenticatedAdmin(validToken)).resolves.toStrictEqual({
        teamMemberId: 'team-member-id',
      });
    });

    test('should throw error when the admin is not active', async () => {
      setup({
        isActive: false,
      });
      await expect(getAuthenticatedAdmin(validToken)).rejects.toBeInstanceOf(Error);
    });

    test('should throws when the access token is invalid', async () => {
      setup({});
      await expect(getAuthenticatedAdmin('invalid-access-token')).rejects.toBeInstanceOf(
        DropboxError
      );
    });
  });

  describe('getCurrentUserAccount', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.DROPBOX_API_BASE_URL}/2/users/get_current_account`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json(currentUserAccount);
        })
      );
    });

    test('should return the current user details', async () => {
      await expect(
        getCurrentUserAccount({
          accessToken: validToken,
          teamMemberId: 'team-member-id',
        })
      ).resolves.toStrictEqual({
        rootNamespaceId: 'root-namespace-id',
        teamMemberId: 'team-member-id',
      });
    });

    test('should throws when the access token is invalid', async () => {
      await expect(
        getCurrentUserAccount({
          accessToken: 'invalid-access-token',
          teamMemberId: 'team-member-id',
        })
      ).rejects.toBeInstanceOf(DropboxError);
    });
  });

  describe('getUsers', () => {
    beforeEach(() => {
      server.use(
        http.post(`${env.DROPBOX_API_BASE_URL}/2/team/members/list_v2`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            has_more: true,
            cursor: nextCursor,
            members: createMembers(0, 5),
          });
        })
      );

      server.use(
        http.post(`${env.DROPBOX_API_BASE_URL}/2/team/members/list/continue_v2`, ({ request }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          return Response.json({
            has_more: false,
            cursor: endCursor,
            members: createMembers(5, 5),
          });
        })
      );
    });

    test('should return users and nextPage when the token is valid and their is another page', async () => {
      await expect(getUsers({ accessToken: validToken, cursor: null })).resolves.toStrictEqual({
        cursor: nextCursor,
        validUsers: createMembers(0, 5),
        invalidUsers: [],
      });
    });

    test('should return users and no nextPage when the token is valid and their is no other page', async () => {
      await expect(
        getUsers({ accessToken: validToken, cursor: nextCursor })
      ).resolves.toStrictEqual({
        cursor: null,
        validUsers: createMembers(5, 5),
        invalidUsers: [],
      });
    });

    test('should throws when the token is invalid', async () => {
      await expect(getUsers({ accessToken: 'foo-bar', cursor: nextCursor })).rejects.toBeInstanceOf(
        DropboxError
      );
    });
  });

  describe('suspendUser', () => {
    beforeEach(() => {
      server.use(
        http.post<{ userId: string }>(
          `${env.DROPBOX_API_BASE_URL}/2/team/members/suspend`,
          async ({ request }) => {
            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }
            const body = (await request.json()) as {
              user: { team_member_id: string };
            };

            if (body.user.team_member_id === 'team-member-id-1') {
              return new Response(undefined, { status: 404 });
            }

            return new Response(undefined, { status: 200 });
          }
        )
      );
    });

    test('should delete user successfully when token is valid', async () => {
      await expect(suspendUser({ accessToken: validToken, teamMemberId })).resolves.not.toThrow();
    });

    test('should not throw when the user is not found', async () => {
      await expect(
        suspendUser({ accessToken: validToken, teamMemberId: 'invalid' })
      ).resolves.not.toThrow();
    });

    test('should throw ZoomError when token is invalid', async () => {
      await expect(
        suspendUser({ accessToken: 'invalidToken', teamMemberId })
      ).rejects.toBeInstanceOf(DropboxError);
    });
  });
});
