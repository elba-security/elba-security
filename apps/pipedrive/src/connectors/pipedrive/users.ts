import { z } from 'zod';
import { env } from '@/common/env';
import { PipedriveError } from '../common/error';

const pipedriveUserSchema = z.object({
  id: z.number(), // ID is a number in the JSON response.
  name: z.string(),
  email: z.string().optional(), // Email is already optional, which is correct.
  active_flag: z.boolean(),
  is_you: z.boolean(),
  is_admin: z.number(),
});

export type PipedriveUser = z.infer<typeof pipedriveUserSchema>;

const pipedriveResponseSchema = z.object({
  data: z.array(z.unknown()),
  additional_data: z.object({
    pagination: z
      .object({
        more_items_in_collection: z.boolean(),
        next_start: z.number(),
      })
      .optional(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
  apiDomain: string;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  apiDomain: string;
};

export const getUsers = async ({ accessToken, page, apiDomain }: GetUsersParams) => {
  const url = new URL(`${apiDomain}/v1/users`);
  url.searchParams.append('limit', String(env.PIPEDRIVE_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('start', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new PipedriveError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { data, additional_data: addtionalData } = pipedriveResponseSchema.parse(resData);

  const validUsers: PipedriveUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data) {
    const userResult = pipedriveUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: addtionalData.pagination?.more_items_in_collection
      ? addtionalData.pagination.next_start
      : null,
  };
};

export const deleteUser = async ({ userId, accessToken, apiDomain }: DeleteUsersParams) => {
  const response = await fetch(`${apiDomain}/v1/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      active_flag: false,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new PipedriveError(`Could not delete user with Id: ${userId}`, { response });
  }
};
