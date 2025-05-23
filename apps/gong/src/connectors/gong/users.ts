import { z } from 'zod';
import { env } from '@/common/env';
import { GongError } from '../common/error';

const gongUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  emailAddress: z.string(),
  active: z.boolean(),
});

export type GongUser = z.infer<typeof gongUserSchema>;

const gongResponseSchema = z.object({
  users: z.array(z.unknown()),
  records: z.object({
    cursor: z.string().optional(),
  }),
});

export type GetUsersParams = {
  userName: string;
  password: string;
  page?: string | null;
};

export const getUsers = async ({ userName, password, page }: GetUsersParams) => {
  const url = new URL(`${env.GONG_API_BASE_URL}/v2/users`);

  const encodedToken = btoa(`${userName}:${password}`);

  if (page) {
    url.searchParams.append('cursor', page);
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${encodedToken}`,
    },
  });

  if (!response.ok) {
    throw new GongError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, records } = gongResponseSchema.parse(resData);

  const validUsers: GongUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = gongUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: records.cursor ? records.cursor : null,
  };
};
