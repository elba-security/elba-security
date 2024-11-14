import { z } from 'zod';
import { env } from '@/common/env';
import { SalesloftError } from '../common/error';

const salesloftUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.object({
    id: z.string(),
  }),
});

export type SalesloftUser = z.infer<typeof salesloftUserSchema>;

const salesloftResponseSchema = z.object({
  data: z.array(z.unknown()),
  metadata: z.object({
    paging: z.object({
      next_page: z.number().nullable(),
    }),
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
  const url = new URL(`${env.SALESLOFT_API_BASE_URL}/v2/users`);

  url.searchParams.append('per_page', `${env.SALESLOFT_USERS_SYNC_BATCH_SIZE}`);
  url.searchParams.append('active', 'true');
  url.searchParams.append('page', page ? page : '1');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SalesloftError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = salesloftResponseSchema.parse(resData);

  const validUsers: SalesloftUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.data) {
    const userResult = salesloftUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const nextPage = result.metadata.paging.next_page;
  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage ? String(nextPage) : null,
  };
};

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.SALESLOFT_API_BASE_URL}/v2/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SalesloftError('Could not retrieve auth user', { response });
  }

  const resData: unknown = await response.json();

  const result = z
    .object({
      data: salesloftUserSchema,
    })
    .safeParse(resData);

  if (!result.success) {
    throw new SalesloftError('Could not parse auth user', { response });
  }

  return result.data.data;
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const response = await fetch(`${env.SALESLOFT_API_BASE_URL}/v2/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ active: false }),
  });

  if (!response.ok && response.status !== 404) {
    throw new SalesloftError(`Could not delete user with Id: ${userId}`, { response });
  }
};
