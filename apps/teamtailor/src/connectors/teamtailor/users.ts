import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

// Helper to get the correct API base URL based on region
const getApiBaseUrl = () => {
  if (env.TEAMTAILOR_API_REGION === 'us') {
    return env.TEAMTAILOR_API_BASE_URL.replace('api.teamtailor.com', 'api.na.teamtailor.com');
  }
  return env.TEAMTAILOR_API_BASE_URL;
};

// TeamTailor uses JSON:API format
const teamtailorUserSchema = z.object({
  id: z.string(),
  type: z.literal('users'),
  attributes: z.object({
    email: z.string().email(),
    'first-name': z.string(),
    'last-name': z.string(),
    name: z.string(),
    username: z.string(),
    role: z.string(),
    status: z.string(),
    picture: z
      .object({
        standard: z.string().nullable(),
      })
      .nullable(),
  }),
  relationships: z
    .object({
      department: z
        .object({
          data: z
            .object({
              id: z.string(),
              type: z.string(),
            })
            .nullable(),
        })
        .optional(),
      team: z
        .object({
          data: z
            .object({
              id: z.string(),
              type: z.string(),
            })
            .nullable(),
        })
        .optional(),
    })
    .optional(),
});

export type TeamtailorUser = z.infer<typeof teamtailorUserSchema>;

const getUsersResponseSchema = z.object({
  data: z.array(teamtailorUserSchema),
  meta: z.object({
    'page-count': z.number(),
    'record-count': z.number(),
  }),
  links: z.object({
    first: z.string().optional(),
    last: z.string().optional(),
    next: z.string().optional(),
    prev: z.string().optional(),
  }),
});

type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

/**
 * Fetches users from TeamTailor API with pagination support
 * @param params - Parameters required to fetch users
 * @returns Object containing valid users, invalid users, and pagination info
 */
export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${getApiBaseUrl()}/v1/users`);

  // TeamTailor uses page[size] for pagination
  url.searchParams.append('page[size]', `${env.TEAMTAILOR_USERS_SYNC_BATCH_SIZE}`);

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Token token=${accessToken}`,
      'X-Api-Version': '20210218',
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = getUsersResponseSchema.parse(resData);

  const validUsers: TeamtailorUser[] = [];
  const invalidUsers: unknown[] = [];

  // TeamTailor returns all users in data array
  for (const user of result.data) {
    validUsers.push(user);
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.links.next ?? null,
  };
};

/**
 * Validates the API key by fetching users
 * TeamTailor doesn't have a /me endpoint, so we validate by listing users
 */
export const validateApiKey = async (accessToken: string) => {
  const url = new URL(`${getApiBaseUrl()}/v1/users`);
  url.searchParams.append('page[size]', '1');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Token token=${accessToken}`,
      'X-Api-Version': '20210218',
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    if (response.status === 403) {
      throw new IntegrationConnectionError('User does not have sufficient permissions', {
        type: 'not_admin',
      });
    }
    throw new IntegrationError('Could not validate API key', { response });
  }

  // If we can list users, the API key is valid
  return true;
};

/**
 * Deletes a user from TeamTailor
 * @param accessToken - API access token
 * @param userId - The user ID to delete
 */
export const deleteUser = async (accessToken: string, userId: string) => {
  const response = await fetch(`${getApiBaseUrl()}/v1/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Token token=${accessToken}`,
      'X-Api-Version': '20210218',
      Accept: 'application/vnd.api+json',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError('Could not delete user', { response });
  }

  return true;
};
