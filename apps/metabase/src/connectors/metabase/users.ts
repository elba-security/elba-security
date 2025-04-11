import { z } from 'zod';
import { env } from '@/common/env';
import { MetabaseError } from '../common/error';

const metabaseUserSchema = z.object({
  id: z.number(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string(),
  is_superuser: z.boolean(), // if true, admin
});

export type MetabaseUser = z.infer<typeof metabaseUserSchema>;

const metabaseResponseSchema = z.object({
  data: z.array(z.unknown()),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type GetUsersParams = {
  apiKey: string;
  domain: string;
  page: number | null;
};

export type DeleteUsersParams = {
  apiKey: string;
  domain: string;
  userId: string;
};

export const getUsers = async ({ apiKey, domain, page }: GetUsersParams) => {
  const url = new URL(`https://${domain}.metabaseapp.com/api/user`);
  url.searchParams.append('limit', String(env.METABASE_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('offset', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new MetabaseError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { data, offset, total, limit } = metabaseResponseSchema.parse(resData);

  const validUsers: MetabaseUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data) {
    const userResult = metabaseUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: total > offset + limit ? offset + limit - 1 : null,
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, apiKey, domain }: DeleteUsersParams) => {
  const url = new URL(`https://${domain}.metabaseapp.com/api/user/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new MetabaseError(`Could not delete user with Id: ${userId}`, { response });
  }
};
