import { z } from 'zod';
import { env } from '@/common/env';
import { StatsigError } from '../commons/error';

const statsigUserSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.string(),
});

export type StatsigUser = z.infer<typeof statsigUserSchema>;

const statsigResponseSchema = z.object({
  data: z.array(z.unknown()),
});

export type GetAllUsersParams = {
  apiKey: string;
  page: number | null;
};

export const getUsers = async ({ apiKey, page = 1 }: GetAllUsersParams) => {
  const endpoint = new URL(`${env.STATSIG_API_BASE_URL}users`);
  endpoint.searchParams.append('limit', String(env.STATSIG_USERS_SYNC_BATCH_SIZE));

  if (page) {
    endpoint.searchParams.append('page', String(page));
  }

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      'statsig-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new StatsigError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { data } = statsigResponseSchema.parse(resData);

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
  };
};
