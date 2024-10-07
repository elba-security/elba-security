import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { ZendeskError } from '../common/error';

const zendeskUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  active: z.boolean(), // We only want active users
  role: z.string(), // admin or agent, end-user should be ignored
});

export type ZendeskUser = z.infer<typeof zendeskUserSchema>;

const zendeskResponseSchema = z.object({
  users: z.array(z.unknown()),
  next_page: z.string().nullable(),
});

const ownerIdResponseSchema = z.object({
  account: z.object({
    owner_id: z.number(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
  subDomain: string;
};
export type GetOwnerIdParams = {
  accessToken: string;
  subDomain: string;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  subDomain: string;
};

export const getUsers = async ({ accessToken, page, subDomain }: GetUsersParams) => {
  const url = new URL(`${subDomain}/api/v2/users`);

  url.searchParams.append('query', 'is_suspended:false');
  url.searchParams.append('role[]', 'admin');
  url.searchParams.append('role[]', 'agent');
  url.searchParams.append('per_page', String(env.ZENDESK_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(page ? page : url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, next_page: nextPage } = zendeskResponseSchema.parse(resData);
  const validUsers: ZendeskUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = zendeskUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};

const zenDeskAuthUserSchema = z.object({
  user: zendeskUserSchema,
});

export const getAuthUser = async ({ accessToken, subDomain }: GetUsersParams) => {
  const url = new URL(`${subDomain}/api/v2/users/me`);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { user } = zenDeskAuthUserSchema.parse(resData);

  if (user.role !== 'admin') {
    throw new Error('User is not an admin');
  }

  return {
    authUserId: String(user.id),
  };
};

// Owner of the organization cannot be deleted
export const suspendUser = async ({ userId, accessToken, subDomain }: DeleteUsersParams) => {
  const response = await fetch(`${subDomain}/api/v2/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      user: {
        suspended: true,
      },
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new ZendeskError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const getOwnerId = async ({ accessToken, subDomain }: GetOwnerIdParams) => {
  const response = await fetch(`${subDomain}/api/v2/account`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = ownerIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Zendesk owner id response', { resData });
    throw new ZendeskError('Invalid Zendesk owner id response');
  }

  return {
    ownerId: String(result.data.account.owner_id),
  };
};
