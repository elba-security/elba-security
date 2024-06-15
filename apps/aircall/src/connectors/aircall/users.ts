import { z } from 'zod';
import { env } from '@/common/env';
import { AircallError } from '../common/error';

const aircallUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  availability_status: z.string(),
  email: z.string(),
});

export type AircallUser = z.infer<typeof aircallUserSchema>;

const aircallResponseSchema = z.object({
  users: z.array(z.unknown()),
  meta: z.object({
    next_page_link: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  token: string;
  nextPageLink?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  token: string;
};

export const getUsers = async ({ token, nextPageLink }: GetUsersParams) => {
  let url = new URL(`${env.AIRCALL_API_BASE_URL}/v1/users`);
  url.searchParams.append('per_page', String(env.AIRCALL_USERS_SYNC_BATCH_SIZE));

  if (nextPageLink) {
    url = new URL(nextPageLink);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new AircallError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();

  const { users, meta } = aircallResponseSchema.parse(data);

  const validUsers: AircallUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = aircallUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: meta.next_page_link,
  };
};

export const deleteUser = async ({ userId, token }: DeleteUsersParams) => {
  const url = new URL(`${env.AIRCALL_API_BASE_URL}/v1/users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new AircallError('Could not delete user', { response });
  }
};
