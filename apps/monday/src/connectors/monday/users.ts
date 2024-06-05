import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MondayError } from '../common/error';

const mondayUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export type MondayUser = z.infer<typeof mondayUserSchema>;

const mondayUserTeamsSchema = z.object({
  id: z.string(),
  teams: z.array(z.object({ id: z.string() })),
});

export type MondayUserTeams = z.infer<typeof mondayUserTeamsSchema>;

const mondayResponseSchema = z.object({
  data: z.object({
    users: z.array(z.unknown()),
  }),
});

export const getUsers = async ({
  accessToken,
  page,
}: {
  accessToken: string;
  page?: number | null;
}) => {
  const query = `
  query {
    users (
      limit: ${env.MONDAY_USERS_SYNC_BATCH_SIZE},
      ${page ? `page: ${page},` : ''}
      kind: non_pending
    ) {
      id,
      email,
      name
    }
  }
`;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'API-Version': env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = mondayResponseSchema.parse(resData);

  const validUsers: MondayUser[] = [];
  const invalidUsers: unknown[] = [];
  const users = result.data.users;

  for (const user of users) {
    const userResult = mondayUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }
  const prevPage = page || 0;

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? prevPage + 1 : null,
  };
};

export const getUsersTeams = async ({
  userIds,
  accessToken,
}: {
  userIds: string[];
  accessToken: string;
}) => {
  const query = `
  query {
    users (
      ids: ${userIds.map((id) => `"${id}"`).join(',')}
    ) {
      id,
      teams {
        id
      }
    }
  }
`;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'API-Version': env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve users teams', { response });
  }

  const resData: unknown = await response.json();
  const result = mondayResponseSchema.parse(resData);

  const validUsers: MondayUserTeams[] = [];
  const invalidUsers: unknown[] = [];
  const users = result.data.users;

  for (const user of users) {
    const userResult = mondayUserTeamsSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return { validUsers, invalidUsers };
};

export const deleteUsersFromWorkspace = async ({
  userIds,
  workspaceId,
  accessToken,
}: {
  accessToken: string;
  userIds: string[];
  workspaceId: string;
}) => {
  const userIdsString = userIds.map((id) => `"${id}"`).join(', ');

  const query = `mutation {
    delete_users_from_workspace(workspace_id: "${workspaceId}", user_ids: [${userIdsString}]) {
      id
    }
  }`;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'API-Version': env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query }),
  });

  logger.info('response delete users workspace', {
    workspaceId,
    userIds,
    json: (await response.json()) as unknown,
  });

  if (!response.ok) {
    throw new MondayError(
      `Could not remove users from workspace ${workspaceId}: ${userIdsString}`,
      { response }
    );
  }
};

export const deleteUsersFromTeam = async ({
  userIds,
  teamId,
  accessToken,
}: {
  accessToken: string;
  userIds: string[];
  teamId: string;
}) => {
  const userIdsString = userIds.map((id) => `"${id}"`).join(', ');

  const query = `mutation {
    remove_users_from_team(team_id: "${teamId}", user_ids: [${userIdsString}]) {
      successful_users {
        id
      }
      failed_users {
        id
      }
    }
  }`;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'API-Version': env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query }),
  });

  logger.info('response delete users teams', {
    teamId,
    userIds,
    json: (await response.json()) as unknown,
  });

  if (!response.ok) {
    throw new MondayError(`Could not remove users from team ${teamId}: ${userIdsString}`, {
      response,
    });
  }
};
