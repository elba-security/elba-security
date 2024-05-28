import { z } from 'zod';
import { env } from '@/common/env';
import { HarvestError } from '../common/error';

const harvestUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  access_roles: z.array(z.string()),
});

export type HarvestUser = z.infer<typeof harvestUserSchema>;

const harvestResponseSchema = z.object({
  users: z.array(z.unknown()),
  links: z.object({
    next: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  accountId: string;
  cursor?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  accountId: string;
};

export const getUsers = async ({ accessToken, accountId, cursor }: GetUsersParams) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/users`);
  url.searchParams.append('per_page', String(env.HARVEST_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('is_active', 'true');

  const response = await fetch(cursor ? cursor : url.toString(), {
    method: 'GET',
    headers: {
      'Harvest-Account-Id': accountId,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new HarvestError('Could not retrieve harvest users', { response });
  }

  const resData: unknown = await response.json();
  const { users, links } = harvestResponseSchema.parse(resData);

  const validUsers: HarvestUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = harvestUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: links.next ? links.next : null,
  };
};

export const deleteUser = async ({ userId, accountId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(`${env.HARVEST_API_BASE_URL}/users/${parseInt(userId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Harvest-Account-Id': String(accountId),
    },
  });

  if (!response.ok) {
    throw new HarvestError(`Could not delete user with Id: ${userId}`, { response });
  }
};
