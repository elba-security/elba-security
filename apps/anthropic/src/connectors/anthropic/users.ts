import { z } from 'zod';
import { IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';

const anthropicResponseSchema = z.object({
  data: z.array(z.unknown()),
  has_more: z.boolean(),
  last_id: z.string().nullable(),
});

const anthropicUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
});

export type AnthropicUser = z.infer<typeof anthropicUserSchema>;

export type DeleteUsersParams = {
  userId: string;
  apiKey: string;
};

type GetUsersParams = {
  apiKey: string;
  page?: string | null;
};

/**
 * Fetches users from your source API with pagination support
 * @param params - Parameters required to fetch users
 * @returns Object containing valid users, invalid users, and pagination info
 */
export const getUsers = async ({ apiKey, page }: GetUsersParams) => {
  const url = new URL(`${env.ANTHROPIC_API_BASE_URL}/v1/organizations/users`);

  url.searchParams.append('limit', `${env.ANTHROPIC_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('after_id', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = anthropicResponseSchema.parse(resData);

  const validUsers: AnthropicUser[] = [];
  const invalidUsers: unknown[] = [];

  // Validate each user and separate valid from invalid ones
  for (const user of result.data) {
    const userResult = anthropicUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.has_more ? result.last_id : null,
  };
};

export const deleteUser = async ({ userId, apiKey }: DeleteUsersParams) => {
  const url = new URL(`${env.ANTHROPIC_API_BASE_URL}/v1/organizations/users/${userId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError(`Could not delete user with Id: ${userId}`, { response });
  }
};
