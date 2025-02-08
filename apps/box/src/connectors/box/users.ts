import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { BoxError, BoxNotAdminError } from '../common/error';

const boxUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  login: z.string(),
  status: z.string(),
});

export type BoxUser = z.infer<typeof boxUserSchema>;

const boxResponseSchema = z.object({
  entries: z.array(z.unknown()),
  offset: z.number(),
  limit: z.number(),
  total_count: z.number(),
});

export type GetUsersParams = {
  accessToken: string;
  nextPage?: string | null;
};

export type DeleteUserParams = {
  userId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, nextPage }: GetUsersParams) => {
  const url = new URL(`${env.BOX_API_BASE_URL}/2.0/users`);
  url.searchParams.append('limit', String(env.BOX_USERS_SYNC_BATCH_SIZE));

  if (nextPage) {
    url.searchParams.append('offset', String(nextPage));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('Could not retrieve users', { response });
    throw new BoxError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();

  const { entries, offset, limit, total_count: totalCount } = boxResponseSchema.parse(data);

  const validUsers: BoxUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of entries) {
    const result = boxUserSchema.safeParse(node);
    if (result.success) {
      if (result.data.status !== 'active') {
        continue;
      }

      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  const nextPageOffset = offset + limit > totalCount ? null : offset + limit;

  return {
    validUsers,
    invalidUsers,
    nextPage: nextPageOffset,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUserParams) => {
  const url = `${env.BOX_API_BASE_URL}/2.0/users/${userId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      status: 'inactive',
    }),
  });

  if (!response.ok && response.status !== 404) {
    logger.error(`Could not deactivate user with Id: ${userId}`, { response });
    throw new BoxError(`Could not deactivate user with Id: ${userId}`, { response });
  }
};

const getAuthUserResponseData = z
  .object({
    id: z.string(),
    role: z.string(),
  })
  .transform((data) => ({
    ...data,
    isAdmin: data.role === 'admin',
  }));

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.BOX_API_BASE_URL}/2.0/users/me`);
  url.searchParams.append('fields', 'id,role');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new BoxError('Could not retrieve auth user id', { response });
  }

  const resData: unknown = await response.json();

  const result = getAuthUserResponseData.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Box auth-user response', { resData });
    throw new BoxError('Invalid Box auth-user response');
  }

  if (!result.data.isAdmin) {
    throw new BoxNotAdminError('Auth user is not an admin');
  }

  return {
    authUserId: String(result.data.id),
  };
};
