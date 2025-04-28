import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { BillError } from '../common/error';

const billUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  archived: z.boolean(),
});

export type BillUser = z.infer<typeof billUserSchema>;

const billResponseSchema = z.object({
  results: z.array(z.unknown()),
  nextPage: z.string().optional(),
});

const getAuthUserResponseData = z.object({
  userId: z.string(),
});

export type GetUsersParams = {
  devKey: string;
  sessionId: string;
  page?: string | null;
};

export type GetAuthUsersParams = {
  devKey: string;
  sessionId: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  devKey: string;
  sessionId: string;
  userId: string;
};

export const getUsers = async ({ devKey, sessionId, page }: GetUsersParams) => {
  const url = new URL(`${env.BILL_API_BASE_URL}/connect/v3/users`);
  url.searchParams.append('max', String(env.BILL_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('page', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      devKey,
      sessionId,
    },
  });

  if (!response.ok) {
    throw new BillError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { results, nextPage } = billResponseSchema.parse(resData);

  const validUsers: BillUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of results) {
    const userResult = billUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage ?? null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, devKey, sessionId }: DeleteUsersParams) => {
  const url = new URL(`${env.BILL_API_BASE_URL}/users/${userId}/archive`);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      devKey,
      sessionId,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new BillError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const getAuthUser = async ({ devKey, sessionId }: GetAuthUsersParams) => {
  const response = await fetch(`${env.BILL_API_BASE_URL}/connect/v3/login/session`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      devKey,
      sessionId,
    },
  });

  if (!response.ok) {
    throw new BillError('Failed to retrieve authenticated user information', { response });
  }

  const data: unknown = await response.json();
  const result = getAuthUserResponseData.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Bill auth user  response', { data });
    throw new BillError('Invalid Bill auth user  response');
  }

  return {
    authUserId: result.data.userId,
  };
};
