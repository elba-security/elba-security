import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env/server';
import { HarvestError } from '../common/error';

const harvestUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  access_roles: z.array(z.string()),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
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
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/users`);
  url.searchParams.append('per_page', String(env.HARVEST_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('is_active', 'true');

  const response = await fetch(page ? page : url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { users, links } = harvestResponseSchema.parse(resData);

  const validUsers: HarvestUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = harvestUserSchema.safeParse(user);
    if (userResult.success) {
      // It is not a reliable way to check, however it is the only way to check if the user was invited
      const isInvited = userResult.data.created_at === userResult.data.updated_at;

      if (isInvited) {
        continue;
      }

      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: links.next,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(`${env.HARVEST_API_BASE_URL}/users/${userId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_active: false }),
  });

  if (!response.ok && response.status !== 404) {
    throw new HarvestError(`Could not delete user with Id: ${userId}`, { response });
  }
};

// DOC: https://help.getharvest.com/api-v2/users-api/users/users/#retrieve-the-currently-authenticated-user
const authUserResponseSchema = z.object({
  id: z.number(),
  access_roles: z.array(z.string()),
  is_active: z.boolean(),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/users/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Harvest auth user response', { resData });
    throw new HarvestError('Invalid Harvest auth user response');
  }

  if (!result.data.access_roles.includes('administrator') || !result.data.is_active) {
    // User is not  account admin
    // TODO: Update this to support latest nango configuration(update the connection error)
    throw new HarvestError('User is not account admin or not active');
  }

  return {
    authUserId: String(result.data.id),
  };
};
