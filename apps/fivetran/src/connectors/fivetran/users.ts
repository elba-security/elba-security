import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { FivetranError } from '../common/error';

const fivetranUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  given_name: z.string(),
  family_name: z.string(),
  role: z.string().nullable(),
  active: z.boolean(),
  invited: z.boolean(),
});

export type FivetranUser = z.infer<typeof fivetranUserSchema>;

const fivetranResponseSchema = z.object({
  data: z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().optional(),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  apiSecret: string;
  cursor?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
  apiSecret: string;
};

const ownerIdResponseSchema = z.object({
  data: z.object({
    user_id: z.string(),
  }),
});

export const getUsers = async ({ apiKey, apiSecret, cursor }: GetUsersParams) => {
  const url = new URL(`${env.FIVETRAN_API_BASE_URL}/users`);
  const encodedKey = btoa(`${apiKey}:${apiSecret}`);

  url.searchParams.append('limit', String(env.FIVETRAN_SYNC_USERS_BATCH_SIZE));

  if (cursor) {
    url.searchParams.append('cursor', String(cursor));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Basic ${encodedKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new FivetranError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { data } = fivetranResponseSchema.parse(resData);

  const validUsers: FivetranUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data.items) {
    const result = fivetranUserSchema.safeParse(node);

    if (result.success) {
      if (result.data.invited || !result.data.active) {
        continue;
      }

      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  const nextPage = data.next_cursor;
  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage ? nextPage : null,
  };
};

export const deleteUser = async ({ userId, apiKey, apiSecret }: DeleteUsersParams) => {
  const url = new URL(`${env.FIVETRAN_API_BASE_URL}/users/${userId}`);
  const encodedKey = btoa(`${apiKey}:${apiSecret}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new FivetranError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export type GetAuthUser = {
  apiKey: string;
  apiSecret: string;
};

export const getAuthUser = async ({ apiKey, apiSecret }: GetAuthUser) => {
  const url = new URL(`${env.FIVETRAN_API_BASE_URL}/account/info`);
  const encodedKey = btoa(`${apiKey}:${apiSecret}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });

  if (!response.ok) {
    throw new FivetranError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = ownerIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Fivetran owner id response', { resData });
    throw new FivetranError('Invalid Fivetran owner id response');
  }

  return {
    authUserId: String(result.data.data.user_id),
  };
};
