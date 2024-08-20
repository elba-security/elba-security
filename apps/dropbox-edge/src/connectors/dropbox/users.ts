import { z } from 'zod';
import { env } from '@/common/env';
import { DropboxError } from '../common/error';

const authenticatedAdminSchema = z.object({
  admin_profile: z.object({
    team_member_id: z.string(),
    membership_type: z.object({
      '.tag': z.literal('full', {
        errorMap: () => ({ message: "Admin doesn't have the full membership" }),
      }),
    }),
    status: z.object({
      '.tag': z.literal('active', {
        errorMap: () => ({ message: 'Admin is not active' }),
      }),
    }),
  }),
});

export type AuthenticatedAdmin = z.infer<typeof authenticatedAdminSchema>;

export const getAuthenticatedAdmin = async (accessToken: string) => {
  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/team/token/get_authenticated_admin`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve user details', { response });
  }

  const data: unknown = await response.json();

  const result = authenticatedAdminSchema.safeParse(data);

  if (!result.success) {
    throw new Error('Not able to get the Dropbox authenticated admin details', {
      cause: result.error,
    });
  }

  return {
    teamMemberId: result.data.admin_profile.team_member_id,
  };
};

const currentAccountSchema = z.object({
  team: z.object({
    id: z.string().min(1, {
      message: 'The account is not a team account',
    }),
    name: z.string(),
  }),
  root_info: z.object({
    '.tag': z.union([z.literal('team'), z.literal('user')]),
    root_namespace_id: z.string(),
  }),
  team_member_id: z.string(),
});

export const getCurrentUserAccount = async ({
  accessToken,
  teamMemberId,
}: {
  accessToken: string;
  teamMemberId: string;
}) => {
  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/users/get_current_account`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Dropbox-API-Select-Admin': teamMemberId,
    },
  });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve user details', { response });
  }

  const data: unknown = await response.json();

  const result = currentAccountSchema.safeParse(data);

  if (!result.success) {
    throw new Error(`Not able to  get the Dropbox current account`, { cause: result.error });
  }

  return {
    rootNamespaceId: result.data.root_info.root_namespace_id,
    teamMemberId: result.data.team_member_id,
  };
};

const teamMemberSchema = z.object({
  profile: z.object({
    root_folder_id: z.string().min(1),
    team_member_id: z.string().min(1),
    email: z.string().optional(),
    name: z.object({
      display_name: z.string().min(1),
    }),
    status: z.object({
      '.tag': z.union([z.literal('active'), z.literal('suspended')]),
    }),
    secondary_emails: z
      .array(
        z.object({
          email: z.string(),
          is_verified: z.boolean(),
        })
      )
      .optional()
      .default([]),
  }),
});

export type DropboxTeamMember = z.infer<typeof teamMemberSchema>;

const getTeamMembersListSchema = z.object({
  has_more: z.boolean(),
  cursor: z.string(),
  members: z.array(z.unknown()),
});

export const getUsers = async ({
  accessToken,
  cursor,
}: {
  accessToken: string;
  cursor: string | null;
}) => {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };

  const response = !cursor
    ? await fetch(`${env.DROPBOX_API_BASE_URL}/2/team/members/list_v2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          include_removed: false,
          limit: env.DROPBOX_SYNC_USERS_BATCH_SIZE,
        }),
      })
    : await fetch(`${env.DROPBOX_API_BASE_URL}/2/team/members/list/continue_v2`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cursor,
        }),
      });

  if (!response.ok) {
    throw await DropboxError.fromResponse('Could not retrieve team members', { response });
  }

  const data: unknown = await response.json();

  const result = getTeamMembersListSchema.parse(data);

  const validUsers: DropboxTeamMember[] = [];
  const invalidUsers: unknown[] = [];

  for (const member of result.members) {
    const userResult = teamMemberSchema.safeParse(member);

    if (userResult.success) {
      // Only active users are valid
      if (userResult.data.profile.status['.tag'] !== 'active') {
        continue;
      }

      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(member);
    }
  }

  return {
    cursor: result.has_more ? result.cursor : null,
    validUsers,
    invalidUsers,
  };
};

export const suspendUser = async ({
  accessToken,
  teamMemberId,
}: {
  accessToken: string;
  teamMemberId: string;
}) => {
  const response = await fetch(`${env.DROPBOX_API_BASE_URL}/2/team/members/suspend`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      user: {
        '.tag': 'team_member_id',
        team_member_id: teamMemberId,
      },
      wipe_data: false,
    }),
  });

  // Possible Errors: https://www.dropbox.com/developers/documentation/http/teams#team-members-suspend
  if (!response.ok && response.status !== 404) {
    throw await DropboxError.fromResponse('Could not suspend user', { response });
  }
};
