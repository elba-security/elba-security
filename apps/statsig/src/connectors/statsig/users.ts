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

export type GetUsers = {
  apiKey: string;
};

export const getUsers = async ({ apiKey }: GetUsers) => {
  // TODO: Pagination parameters required from August 1st 2024, https://docs.statsig.com/console-api/users#get-/users
  const url = new URL(`${env.STATSIG_API_BASE_URL}/users`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'STATSIG-API-KEY': apiKey,
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
