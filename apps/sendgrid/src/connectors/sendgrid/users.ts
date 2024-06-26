import { z } from 'zod';
import { env } from '@/common/env';
import { SendgridError } from '../commons/error';

const sendgridUserSchema = z.object({
  username: z.string().min(1),
  email: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  user_type: z.string().min(1), // 'owner' | 'admin' | 'teammate'
});

export type SendgridUser = z.infer<typeof sendgridUserSchema>;

const sendgridResponseSchema = z.object({
  result: z.array(z.unknown()),
});

export type GetUsersParams = {
  apiKey: string;
  offset: number | 0;
};

export type DeleteUsersParams = {
  apiKey: string;
  userId: string;
};

export const getUsers = async ({ apiKey, offset }: GetUsersParams) => {
  const url = new URL(`${env.SENDGRID_API_BASE_URL}/v3/teammates`);
  url.searchParams.append('limit', String(env.SENDGRID_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('offset', String(offset));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new SendgridError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { result: users } = sendgridResponseSchema.parse(resData);

  const validUsers: SendgridUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = sendgridUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage:
      users.length === env.SENDGRID_USERS_SYNC_BATCH_SIZE
        ? offset + env.SENDGRID_USERS_SYNC_BATCH_SIZE
        : null,
  };
};

export const deleteUser = async ({ userId, apiKey }: DeleteUsersParams) => {
  const response = await fetch(`${env.SENDGRID_API_BASE_URL}/v3/teammates/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new SendgridError(`Could not delete user with Id: ${userId}`, { response });
  }
};
