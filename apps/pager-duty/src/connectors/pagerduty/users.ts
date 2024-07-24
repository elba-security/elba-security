import { z } from 'zod';
import { env } from '@/common/env';
import { PagerdutyError } from '../common/error';

const pagerdutyUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  invitation_sent: z.boolean(),
});

export type PagerdutyUser = z.infer<typeof pagerdutyUserSchema>;

const pagerdutyResponseSchema = z.object({
  users: z.array(z.unknown()),
  offset: z.number(),
  more: z.boolean(),
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
  const url = new URL(`${env.PAGERDUTY_API_BASE_URL}users`);
  url.searchParams.append('limit', String(env.PAGERDUTY_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('offset', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PagerdutyError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, offset, more } = pagerdutyResponseSchema.parse(resData);

  const validUsers: PagerdutyUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = pagerdutyUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: more ? offset + 1 : null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.PAGERDUTY_API_BASE_URL}users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new PagerdutyError(`Could not delete user with Id: ${userId}`, { response });
  }
};
