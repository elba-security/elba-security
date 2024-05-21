import { z } from 'zod';
import { env } from '@/common/env';
import { MondayError } from '../common/error';

const mondayUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export type MondayUser = z.infer<typeof mondayUserSchema>;

const mondayResponseSchema = z.object({
  data: z.object({
    users: z.array(z.unknown()),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: number | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userIds: string[];
  workspaceId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const query = `
  query {
    users (
      limit: ${env.MONDAY_USERS_SYNC_BATCH_SIZE}, 
      ${page ? `page: ${page},` : ''}
      kind: non_pending 
    ) { 
      id, 
      email, 
      name, 
      is_admin, 
      is_guest, 
      is_pending
    }
  }
`;

  const response = await fetch(`${env.MONDAY_API_BASE_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
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
  const prevPage = page ? page : 0;

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? prevPage + 1 : null,
  };
};

export const deleteUsers = async ({ userIds, workspaceId, accessToken }: DeleteUsersParams) => {
  const userIdsString = userIds.map((id) => `"${id}"`).join(', ');

  const query = `mutation {
    delete_users_from_workspace(workspace_id: "${workspaceId}", user_ids: [${userIdsString}]) {
      id
    }
  }`;

  const response = await fetch(`${env.MONDAY_API_BASE_URL}`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new MondayError(`Could not suspend users with Id: ${userIdsString}`, { response });
  }
};
