import { z } from 'zod';
import { env } from '@/env';
import { PipedriveError } from './commons/error';

const pipedriveUserSchema = z.object({
  id: z.number(), // ID is a number in the JSON response.
  name: z.string(),
  email: z.string().optional(), // Email is already optional, which is correct.
  active_flag: z.boolean(),
  is_admin: z.number(),
  phone: z.string().nullable().optional(), // Phone can be null, and is also optional.
});

export type PipedriveUser = z.infer<typeof pipedriveUserSchema>;

const pipedriveResponseSchema = z.object({
  data: z.array(z.unknown()),
  additional_data: z.object({
    pagination: z
      .object({
        start: z.number(),
        limit: z.number(),
        more_items_in_collection: z.boolean(),
        next_start: z.number(),
      })
      .optional(),
  }),
});

export type GetUsersParams = {
  token: string;
  start?: string | null;
  apiDomain: string;
};

const limit = env.USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ token, start, apiDomain }: GetUsersParams) => {
  const url = new URL(`${apiDomain}/v1/users`);
  url.searchParams.append('limit', String(limit));
  if (start) {
    url.searchParams.append('start', String(start));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    throw new PipedriveError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { data, additional_data: addtionalData } = pipedriveResponseSchema.parse(resData);

  const validUsers: PipedriveUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = pipedriveUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
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
