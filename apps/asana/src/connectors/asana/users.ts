import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';

const asanaUserSchema = z.object({
  gid: z.string(),
  name: z.string(),
  email: z.string().email(),
  is_active: z.literal(true), // We only want active users
  resource_type: z.literal('user'), // We only want users
});

export type AsanaUser = z.infer<typeof asanaUserSchema>;

const asanaResponseSchema = z.object({
  data: z.array(z.unknown()),
  next_page: z
    .object({
      offset: z.string(),
    })
    .optional(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  workspaceId: string;
};

const ownerIdResponseSchema = z.object({
  data: z.object({
    gid: z.string(),
  }),
});

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.ASANA_API_BASE_URL}/users`);

  url.searchParams.append('opt_fields', 'resource_type, email, name, is_active');
  // In order to define the page 'limit', we need to provide the workspace id,  else it will return an error 400
  // We don't provide the workspace id here because we list all users from all workspaces together

  if (page) {
    url.searchParams.append('offset', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = asanaResponseSchema.parse(resData);

  const validUsers: AsanaUser[] = [];
  const invalidUsers: unknown[] = [];

  // We don't have any ways to eliminate the invited users, we send them all to elba even if they are invalid
  // However, In Asana dashboard, we can't see the invited users tab
  for (const user of result.data) {
    const userResult = asanaUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.next_page?.offset ?? null,
  };
};

export const deleteUser = async ({ userId, workspaceId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(`${env.ASANA_API_BASE_URL}/workspaces/${workspaceId}/removeUser`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      data: {
        user: userId,
      },
    }),
  });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new AsanaError('Could not delete user', { response });
  }
};

export const getOwnerId = async ({ accessToken }: { accessToken: string }) => {
  const url = new URL(`${env.ASANA_API_BASE_URL}/users/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = ownerIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Asana owner id response', { resData });
    throw new AsanaError('Invalid Asana owner id response');
  }

  return {
    ownerId: result.data.data.gid,
  };
};
