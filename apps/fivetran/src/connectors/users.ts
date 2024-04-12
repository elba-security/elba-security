import { z } from 'zod';
import { env } from '@/env';
import { getFivetranApiClient } from '@/common/apiclient';
import { FivetranError } from './commons/error';

const fivetranUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  given_name: z.string(),
  family_name: z.string(),
  role: z.string(),
  active: z.boolean(),
});

export type FivetranUser = z.infer<typeof fivetranUserSchema>;

const fivetranResponseSchema = z.object({
  data: z.object({
    items: z.array(z.unknown()),
    next_cursor: z.string().optional(),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  apiSecret: string;
  afterToken?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
  apiSecret: string;
};

export const getUsers = async ({ apiKey, apiSecret, afterToken }: GetUsersParams) => {
  const endpoint = new URL(`${env.FIVETRAN_API_BASE_URL}users`);
  const encodedKey = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  if (afterToken) {
    endpoint.searchParams.append('cursor', String(afterToken));
  }

  const fivetranApiClient = getFivetranApiClient();

  const resData: unknown = await fivetranApiClient.get(endpoint.toString(), encodedKey);

  const { data } = fivetranResponseSchema.parse(resData);

  const validUsers: FivetranUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data.items) {
    const result = fivetranUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  const nextPage = data.next_cursor;
  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage ? nextPage : null,
  };
};

export const deleteUser = async ({ userId, apiKey, apiSecret }: DeleteUsersParams) => {
  const url = `${env.FIVETRAN_API_BASE_URL}users/${userId}`;
  const encodedKey = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new FivetranError(`Could not delete user with Id: ${userId}`, { response });
  }
};
