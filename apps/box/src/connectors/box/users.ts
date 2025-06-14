import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';

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
  page?: string | null;
};

export type DeleteUserParams = {
  userId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.BOX_API_BASE_URL}/2.0/users`);

  url.searchParams.append('limit', String(env.BOX_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('offset', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Could not retrieve users', { response });
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

  return {
    validUsers,
    invalidUsers,
    nextPage: offset + limit > totalCount ? null : String(offset + limit),
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
    throw new IntegrationError(`Could not delete user with Id: ${userId}`, { response });
  }
};
const authUserResponseSchema = z
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
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    throw new IntegrationError('Could not retrieve authenticated user', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Box auth user response', { resData, error: result.error });
    throw new IntegrationConnectionError('Invalid Box authenticated user response', {
      type: 'unknown',
      metadata: { data: resData, errors: result.error.issues },
    });
  }

  // Box has its own validation for admin and owner roles since out OAuth apps asks for admin permissions, normal user can't install the app
  // however, we are doing this check here to be sure
  if (!result.data.isAdmin) {
    throw new IntegrationConnectionError('Authenticated user is not owner or admin', {
      type: 'not_admin',
      metadata: result.data,
    });
  }

  return {
    authUserId: String(result.data.id),
  };
};
