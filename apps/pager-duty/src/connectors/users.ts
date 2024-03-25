import { z } from 'zod';
import { env } from '@/env';
import { PagerdutyError } from './commons/error';

const pagerdutyUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
});

export type PagerdutyUser = z.infer<typeof pagerdutyUserSchema>;

const pagerdutyResponseSchema = z.object({
  users: z.array(z.unknown()),
  offset: z.number(),
  more: z.boolean(),
});

export type GetUsersParams = {
  token: string;
  nextPage?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  token: string;
};

const count = env.USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ token, nextPage }: GetUsersParams) => {
  const url = new URL(`${env.PAGERDUTY_API_BASE_URL}users`);
  url.searchParams.append('limit', String(count));

  if (nextPage) {
    url.searchParams.append('offset', String(nextPage));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new PagerdutyError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const { users, offset, more } = pagerdutyResponseSchema.parse(data);

  const validUsers: PagerdutyUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = pagerdutyUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: more ? offset + 1 : null,
  };
};

export const deleteUsers = async ({ userId, token }: DeleteUsersParams) => {
  const url = new URL(`${env.PAGERDUTY_API_BASE_URL}users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new PagerdutyError(`Could not delete user with Id: ${userId}`, { response });
  }
};
