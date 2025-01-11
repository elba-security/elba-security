import { z } from 'zod';
import { env } from '@/common/env';
import { ApolloError } from '../common/error';

const apolloUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  deleted: z.boolean(),
});

export type ApolloUser = z.infer<typeof apolloUserSchema>;

const apolloResponseSchema = z.object({
  users: z.array(z.unknown()),
  pagination: z.object({
    total_pages: z.number(),
    page: z.string(),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  after: number;
};

export type DeleteUserParams = {
  userId: string;
  apiKey: string;
};

const perPage = env.APOLLO_USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ apiKey, after }: GetUsersParams) => {
  const url = new URL(`${env.APOLLO_API_BASE_URL}/v1/users/search`);

  url.searchParams.append('per_page', String(perPage));
  if (after) {
    url.searchParams.append('page', String(after));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok) {
    throw new ApolloError('API request failed', { response });
  }

  const resData: unknown = await response.json();
  const { users, pagination } = apolloResponseSchema.parse(resData);

  const validUsers: ApolloUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = apolloUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: pagination.total_pages > after ? parseInt(pagination.page, 10) + 1 : null,
  };
};

export const deleteUser = async ({ userId, apiKey }: DeleteUserParams) => {
  const url = new URL(`${env.APOLLO_API_BASE_URL}/v1/users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'X-Api-Key': apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new ApolloError(`Could not delete user with Id: ${userId}`, { response });
  }
};
