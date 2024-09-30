import { z } from 'zod';
import { env } from '@/common/env';
import { StatsigError } from '../common/error';

const statsigUserSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
});

export type StatsigUser = z.infer<typeof statsigUserSchema>;

const statsigResponseSchema = z.object({
  data: z.array(z.unknown()),
  pagination: z.object({
    nextPage: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  page?: string | null;
};

export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const baseUrl = `${env.STATSIG_API_BASE_URL}${page ? page : '/console/v1/users'}`;
  const url = new URL(baseUrl);

  if (!page) {
    url.searchParams.append('limit', String(env.STATSIG_USERS_SYNC_BATCH_SIZE));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'STATSIG-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new StatsigError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { data, pagination } = statsigResponseSchema.parse(resData);

  const validUsers: StatsigUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = statsigUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }
  return {
    validUsers,
    invalidUsers,
    nextPage: pagination.nextPage,
  };
};
