import { z } from 'zod';
import { env } from '@/common/env';
import { AirslateError } from '../common/error';

const airslateUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  role: z.object({
    code: z.string(),
  }),
  org_data: z.object({
    status: z.string(),
  }),
});

export type AirslateUser = z.infer<typeof airslateUserSchema>;

const airslateResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    current_page: z.number(),
    last_page: z.number(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  workspaceId: string;
  page: string;
};

export type DeleteUsersParams = {
  accessToken: string;
  workspaceId: string;
  userId: string;
};

export const getUsers = async ({ accessToken, workspaceId, page }: GetUsersParams) => {
  const url = new URL(`${env.AIRSLATE_API_BASE_URL}/organizations/${workspaceId}/users`);

  url.searchParams.append('per_page', `${env.AIRSLATE_USERS_SYNC_BATCH_SIZE}`);
  url.searchParams.append('page', page);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AirslateError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = airslateResponseSchema.parse(resData);

  const validUsers: AirslateUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.data) {
    const userResult = airslateUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage:
      result.meta.current_page < result.meta.last_page ? String(parseInt(page, 10) + 1) : null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken, workspaceId }: DeleteUsersParams) => {
  const response = await fetch(
    `${env.AIRSLATE_API_BASE_URL}/organizations/${workspaceId}/users/${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        status: 'BLOCKED',
      }),
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new AirslateError(`Could not delete user with Id: ${userId}`, { response });
  }
};
