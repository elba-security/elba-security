import { z } from 'zod';
import { env } from '@/common/env';
import { PandadocError } from '../common/error';

const pandadocUserSchema = z.object({
  user_id: z.string().min(1),
  email: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
});

export type PandadocUser = z.infer<typeof pandadocUserSchema>;

const pandadocResponseSchema = z.object({
  results: z.array(z.unknown()),
  total: z.number(),
});

export type GetUsersParams = {
  apiKey: string;
  page: number;
};

export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const url = new URL(`${env.PANDADOC_API_BASE_URL}/public/v1/users`);
  url.searchParams.append('count', String(env.PANDADOC_USERS_SYNC_BATCH_SIZE));
  if (page) {
    url.searchParams.append('page', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `API-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new PandadocError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { results: users } = pandadocResponseSchema.parse(resData);

  const validUsers: PandadocUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = pandadocUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? page + 1 : null,
  };
};
