import { z } from 'zod';
import { env } from '@/common/env';
import { SentryError } from '../common/error';
import { getNextCursorFromHeader } from '../utils/pagination';

const sentryUserSchema = z.object({
  role: z.string(),
  id: z.string(),
  name: z.string(),
  email: z.string(),
  pending: z.boolean(),
  user: z
    .object({
      has2fa: z.boolean(),
      isActive: z.boolean(),
    })
    .nullable(),
});

export type SentryUser = z.infer<typeof sentryUserSchema>;

const sentryResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  accessToken: string;
  cursor?: string | null;
  organizationSlug: string;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  organizationSlug: string;
};

export const getUsers = async ({ accessToken, cursor, organizationSlug }: GetUsersParams) => {
  const url = new URL(`${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/`);

  url.searchParams.append('per_page', String(`${env.HARVEST_USERS_SYNC_BATCH_SIZE}`));
  if (cursor) {
    url.searchParams.append('cursor', String(cursor));
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

  for (const user of result) {
    const userResult = sentryUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const linkHeader = response.headers.get('Link');
  const nextCursor = linkHeader ? getNextCursorFromHeader(linkHeader) : null;

  return {
    validUsers,
    invalidUsers,
    nextPage: nextCursor,
  };
};

export const deleteUser = async ({ userId, organizationSlug, accessToken }: DeleteUsersParams) => {
  const response = await fetch(
    `${env.SENTRY_API_BASE_URL}/organizations/${organizationSlug}/members/${userId}/`,
    {
      method: 'delete',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new SentryError(`Could not delete a user with Id: ${userId}`, { response });
  }
};
