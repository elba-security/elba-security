import { z } from 'zod';
import { env } from '@/common/env';
import { CheckrError } from '../common/error';

const checkrUserSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  roles: z.array(
    z.object({
      name: z.string(),
    })
  ),
});

export type CheckrUser = z.infer<typeof checkrUserSchema>;

const checkrResponseSchema = z.object({
  data: z.array(z.unknown()),
  next_href: z.string().nullable(),
});

export type GetUsersParams = {
  apiKey: string;
  page: string | null;
};

export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const url = new URL(`${env.CHECKR_API_BASE_URL}/v1/users`);
  url.searchParams.append('per_page', String(env.CHECKR_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${apiKey}:`)}`,
    },
  });

  if (!response.ok) {
    throw new CheckrError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { data, next_href: nextPage } = checkrResponseSchema.parse(resData);

  const validUsers: CheckrUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = checkrUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};
