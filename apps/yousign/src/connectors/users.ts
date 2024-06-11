import { z } from 'zod';
import { env } from '@/env';
import { YousignError } from './commons/error';

const yousignUserSchema = z.object({
  id: z.string().uuid(), // ID is a number in the JSON response.
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone_number: z.string(),
  is_active: z.boolean(),
  role: z.string(),
});

export type YousignUser = z.infer<typeof yousignUserSchema>;

const yousignResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    next_cursor: z.string().nullable(),
  }),
});

export type GetUsersParams = {
  token: string;
  after?: string | null;
};

export const getUsers = async ({ token, after }: GetUsersParams) => {
  const url = new URL(`${env.YOUSIGN_API_BASE_URL}v3/users`);
  if (after) {
    url.searchParams.append('after', String(after));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new YousignError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { data, meta } = yousignResponseSchema.parse(resData);

  const validUsers: YousignUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = yousignUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: meta.next_cursor,
  };
};
