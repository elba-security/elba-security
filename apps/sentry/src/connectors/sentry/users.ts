import { z } from 'zod';
import { env } from '@/common/env';
import { SentryError } from '../common/error';

const sentryUserSchema = z.object({
  gid: z.string(),
  name: z.string(),
  email: z.string(),
});

export type SentryUser = z.infer<typeof sentryUserSchema>;

const sentryResponseSchema = z.object({
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

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.SENTRY_API_BASE_URL}/users`);

  const optFields = 'email, name';

  url.searchParams.append('opt_fields', optFields);

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
    throw new SentryError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = sentryResponseSchema.parse(resData);

  const validUsers: SentryUser[] = [];
  const invalidUsers: unknown[] = [];
  const users = result.data;

  for (const user of users) {
    const userResult = sentryUserSchema.safeParse(user);
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
  const response = await fetch(`${env.SENTRY_API_BASE_URL}/workspaces/${workspaceId}/removeUser`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      data: {
        user: `${userId}`,
      },
    }),
  });

  if (!response.ok) {
    throw new SentryError(`Could not remove a user with Id: ${userId}`, { response });
  }
};
