import { z } from 'zod';
import { env } from '@/common/env';
import { RampError } from '../common/error';

const rampUserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
});

export type RampUser = z.infer<typeof rampUserSchema>;

const rampResponseSchema = z.object({
  data: z.array(z.unknown()),
  page: z.object({
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

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.RAMP_API_BASE_URL}/developer/v1/users`);
  url.searchParams.append('page_size', String(env.RAMP_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new RampError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { data, page: nextPage } = rampResponseSchema.parse(resData);

  const validUsers: RampUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data) {
    const userResult = rampUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage.next,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.RAMP_API_BASE_URL}/developer/v1/users/${userId}/deactivate`);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new RampError(`Could not delete user with Id: ${userId}`, { response });
  }
};
