import { z } from 'zod';
import { env } from '@/common/env';
import { InstantlyError } from '../common/error';

const instantlyUserSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  accepted: z.boolean(),
});

export type InstantlyUser = z.infer<typeof instantlyUserSchema>;

const instantlyResponseSchema = z.object({
  items: z.array(z.unknown()),
  next_starting_after: z.string().optional(),
});

export type GetUsersParams = {
  apiKey: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
};

export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const url = new URL(`${env.INSTANTLY_API_BASE_URL}/api/v2/workspace-members`);

  url.searchParams.append('limit', String(env.INSTANTLY_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('starting_after', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new InstantlyError('Could not retrieve Instantly users', { response });
  }

  const resData: unknown = await response.json();

  const resultData = instantlyResponseSchema.parse(resData);

  const validUsers: InstantlyUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of resultData.items) {
    const result = instantlyUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: validUsers.length > 0 ? resultData.next_starting_after ?? null : null,
  };
};

export const deleteUser = async ({ apiKey, userId }: DeleteUsersParams) => {
  const url = new URL(`${env.INSTANTLY_API_BASE_URL}/api/v2/workspace-members/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new InstantlyError(`Could not delete user with Id: ${userId}`, { response });
  }
};
