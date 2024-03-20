import { z } from 'zod';
import { env } from '@/env';
import { JumpcloudError } from './commons/error';

const jumpcloudUserSchema = z.object({
  _id: z.string(),
  firstname: z.string(),
  lastname: z.string(),
  email: z.string(),
  suspended: z.boolean(),
  enableMultiFactor: z.boolean(),
});

export type JumpcloudUser = z.infer<typeof jumpcloudUserSchema>;

const jumpcloudResponseSchema = z.object({
  results: z.array(z.unknown()),
  skip: z.string().nullable().optional(),
});

export type GetUsersParams = {
  apiKey: string;
  after: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
};

const perPage = env.USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ apiKey, after }: GetUsersParams) => {
  const url = new URL(`${env.JUMPCLOUD_API_BASE_URL}users`);

  url.searchParams.append('limit', String(perPage));

  // Ensure 'after' is defined before appending 'skip'
  if (after) {
    url.searchParams.append('skip', String(after));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': `${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new JumpcloudError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { results, skip } = jumpcloudResponseSchema.parse(resData);

  const validUsers: JumpcloudUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of results) {
    const result = jumpcloudUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }
  
  return {
    validUsers,
    invalidUsers,
    nextPage: skip ? skip : null,
  };
};

export const deleteUsers = async ({ userId, apiKey }: DeleteUsersParams) => {
  const url = new URL(`${env.JUMPCLOUD_API_BASE_URL}users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': `${apiKey}`,
    },
  });

  if (!response.ok && response.status !== 404 && response.status !== 400) {
    throw new JumpcloudError('Could not delete user', { response });
  }
};
