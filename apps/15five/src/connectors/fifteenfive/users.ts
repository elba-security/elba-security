import { z } from 'zod';
import { env } from '@/common/env';
import { FifteenFiveError } from '../common/error';

const fifteenFiveUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
});

export type FifteenFiveUser = z.infer<typeof fifteenFiveUserSchema>;

const fifteenfiveResponseSchema = z.object({
  results: z.array(z.unknown()),
  next: z.string().nullable(),
});

export type GetUsersParams = {
  apiKey: string;
  nextPageUrl?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
};

export type CheckUserWithEmailParams = {
  apiKey: string;
  email: string;
};

export const getUsers = async ({ apiKey, nextPageUrl }: GetUsersParams) => {
  const endpoint = new URL(`${env.FIFTEENFIVE_API_BASE_URL}/api/public/user`);
  endpoint.searchParams.append('page_size', String(env.fifteenFIVE_USERS_SYNC_BATCH_SIZE));
  endpoint.searchParams.append('is_active', 'true');

  const response = await fetch(nextPageUrl ? nextPageUrl : endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new FifteenFiveError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { results, next } = fifteenfiveResponseSchema.parse(resData);

  const validUsers: FifteenFiveUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of results) {
    const result = fifteenFiveUserSchema.safeParse(node);

    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: next,
  };
};

export const deleteUser = async ({ userId, apiKey }: DeleteUsersParams) => {
  const url = new URL(`${env.FIFTEENFIVE_API_BASE_URL}/api/public/user/${userId}`);

  const response = await fetch(url, {
    method: 'put',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      is_active: false,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new FifteenFiveError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const checkUserWithEmail = async ({ apiKey, email }: CheckUserWithEmailParams) => {
  const endpoint = new URL(`${env.FIFTEENFIVE_API_BASE_URL}/api/public/user`);
  endpoint.searchParams.append('is_admin', 'true');
  endpoint.searchParams.append('email', email);

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new FifteenFiveError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { results } = fifteenfiveResponseSchema.parse(resData);
  return {
    isValidEmail: results.length > 0,
  };
};
