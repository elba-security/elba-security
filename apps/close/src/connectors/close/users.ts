import { z } from 'zod';
import { env } from '@/common/env';
import { CloseError } from '../common/error';

const closeUserSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  organizations: z.array(z.string()),
});

export type CloseUser = z.infer<typeof closeUserSchema>;

const closeResponseSchema = z.object({
  data: z.array(z.unknown()),
  has_more: z.boolean(),
});

export type GetUsersParams = {
  accessToken: string;
  page: number | null;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.CLOSE_API_BASE_URL}/api/v1/user`);
  url.searchParams.append('_limit', `${env.CLOSE_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('_skip', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new CloseError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = closeResponseSchema.parse(resData);

  const validUsers: CloseUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.data) {
    const userResult = closeUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.has_more ? (page || 0) + env.CLOSE_USERS_SYNC_BATCH_SIZE : null,
  };
};
