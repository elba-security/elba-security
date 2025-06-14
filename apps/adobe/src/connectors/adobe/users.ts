import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

const adobeUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  username: z.string().optional(),
  status: z.enum(['active', 'disabled', 'locked', 'removed']),
  type: z.enum(['adobeID', 'enterpriseID', 'federatedID', 'unknown']),
  country: z.string().optional(),
  domain: z.string().optional(),
  groups: z.array(z.string()).default([]),
  tags: z.array(z.string()).optional(),
});

export type AdobeUser = z.infer<typeof adobeUserSchema>;

const getUsersResponseSchema = z.object({
  result: z.enum(['success', 'error']),
  lastPage: z.boolean(),
  users: z.array(z.unknown()),
});

type GetUsersParams = {
  accessToken: string;
  apiKey: string;
  organizationId: string;
  page?: number;
};

/**
 * Fetches users from Adobe UMAPI with pagination support
 * @param params - Parameters required to fetch users
 * @returns Object containing valid users, invalid users, and pagination info
 */
export const getUsers = async ({
  accessToken,
  apiKey,
  organizationId,
  page = 0,
}: GetUsersParams) => {
  const url = `${env.ADOBE_API_BASE_URL}/v2/usermanagement/users/${organizationId}/${page}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Api-Key': apiKey,
      Accept: 'application/json',
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

  if (result.result !== 'success') {
    throw new IntegrationError('API returned error result', { response });
  }

  const validUsers: AdobeUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.users) {
    const userResult = adobeUserSchema.safeParse(user);
    if (userResult.success) {
      // Only include active users
      if (userResult.data.status === 'active') {
        validUsers.push(userResult.data);
      }
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.lastPage ? null : page + 1,
  };
};

const organizationResponseSchema = z.object({
  orgId: z.string(),
  orgName: z.string(),
  orgType: z.string(),
  orgRef: z.object({
    orgId: z.string(),
    orgName: z.string(),
    ident: z.string(),
  }),
});

/**
 * Fetches the authenticated user's organization information
 * This is used to get the organization ID needed for other API calls
 */
export const getOrganization = async (accessToken: string, apiKey: string) => {
  const url = `${env.ADOBE_API_BASE_URL}/v2/usermanagement/organizations`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve organization', { response });
  }

  const resData: unknown = await response.json();
  const result = organizationResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new IntegrationConnectionError('Invalid organization data', {
      type: 'unknown',
      metadata: { data: resData, errors: result.error.issues },
    });
  }

  return result.data;
};
