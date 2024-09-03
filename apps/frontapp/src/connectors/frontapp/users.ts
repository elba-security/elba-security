import { z } from 'zod';
import { env } from '@/common/env';
import { FrontappError } from '../common/error';

const frontappUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_admin: z.boolean(),
  is_blocked: z.boolean(),
});

export type FrontappUser = z.infer<typeof frontappUserSchema>;

const frontappResponseSchema = z.object({
  _results: z.array(z.unknown()),
  _pagination: z.object({
    next: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.FRONTAPP_API_BASE_URL}/teammates`);

  url.searchParams.append('limit', `${env.FRONTAPP_USERS_SYNC_BATCH_SIZE}`);

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new FrontappError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = frontappResponseSchema.parse(resData);

  const validUsers: FrontappUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result._results) {
    const userResult = frontappUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result._pagination.next,
  };
};
