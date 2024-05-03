import { z } from 'zod';
import { env } from '@/common/env';
import { MondayError } from '../common/error';

const mondayUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export type MondayUser = z.infer<typeof mondayUserSchema>;

const mondayUsersResponseSchema = z.object({
  data: z.object({
    users: z.array(z.unknown()),
  }),
  account_id: z.number(),
});

export type MondayUsersResponse = z.infer<typeof mondayUsersResponseSchema>;

export const getUsers = async ({ token, page }: { token: string; page: number | null }) => {
  const query = `query { users (limit: ${env.MONDAY_USERS_SYNC_BATCH_SIZE},  page: ${page}, kind: non_pending ) { id, email, name, is_admin, is_guest, is_pending}}`;

  const response = await fetch(`${env.MONDAY_API_BASE_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = mondayUsersResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new Error('Could not parse users response', {
      cause: result.error,
    });
  }

  const validUsers: MondayUser[] = [];
  const invalidUsers: unknown[] = [];
  const users = result.data.data.users;

  for (const user of users) {
    const userResult = mondayUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const prevPage = page ? page : 0;

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? prevPage + 1 : null,
  };
};

export const deleteUser = async ({ userId, token }: { userId: string; token: string }) => {
  const query = `mutation { delete_user (user_id: ${userId}) { id }}`;

  const response = await fetch(`${env.MONDAY_API_BASE_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new MondayError(`Could not delete user with Id: ${userId}`, { response });
  }
};
