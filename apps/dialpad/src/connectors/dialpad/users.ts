import { z } from 'zod';
import { env } from '@/common/env';
import { DialpadError } from '../common/error';

const dialpadUserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  emails: z.array(z.string()),
  is_super_admin: z.boolean(),
  state: z.string(), // active or suspended
});

export type DialpadUser = z.infer<typeof dialpadUserSchema>;

const dialpadResponseSchema = z.object({
  items: z.array(z.unknown()),
  cursor: z.string().optional(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.DIALPAD_API_BASE_URL}/api/v2/users`);
  url.searchParams.append('limit', String(env.DIALPAD_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('cursor', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new DialpadError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { items, cursor } = dialpadResponseSchema.parse(resData);

  const validUsers: DialpadUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of items) {
    const userResult = dialpadUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: cursor ?? null,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.DIALPAD_API_BASE_URL}/api/v2/users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      state: 'suspended',
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new DialpadError(`Could not delete user with Id: ${userId}`, { response });
  }
};
