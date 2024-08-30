import { z } from 'zod';
import { logger } from '@elba-security/logger';
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
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

const ownerIdResponseSchema = z.object({
  id: z.number(),
});

const companyDomainResponseSchema = z.object({
  full_domain: z.string(),
});

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/users`);
  url.searchParams.append('per_page', String(env.HARVEST_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('is_active', 'true');

  const response = await fetch(page ? page : url.toString(), {
    method: 'GET',
    headers: {
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
  const response = await fetch(`${env.HARVEST_API_BASE_URL}/users/${parseInt(userId)}`, {
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

export const getOwnerId = async ({ accessToken }: { accessToken: string }) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/users/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = ownerIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Harvest owner id response', { resData });
    throw new HarvestError('Invalid Harvest owner id response');
  }

  return {
    ownerId: String(result.data.id),
  };
};

export const getCompanyDomain = async ({ accessToken }: { accessToken: string }) => {
  const url = new URL(`${env.HARVEST_API_BASE_URL}/company`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HarvestError('Could not retrieve company domain', { response });
  }

  const resData: unknown = await response.json();

  const result = companyDomainResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Harvest company domain response', { resData });
    throw new HarvestError('Invalid Harvest company domain response');
  }

  return {
    companyDomain: result.data.full_domain,
  };
};
