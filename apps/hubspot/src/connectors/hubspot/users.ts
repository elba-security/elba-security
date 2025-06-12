import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

const hubspotUserSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  superAdmin: z.boolean(),
});

export type HubspotUser = z.infer<typeof hubspotUserSchema>;

const hubspotResponseSchema = z.object({
  results: z.array(z.unknown()),
  paging: z
    .object({
      next: z
        .object({
          after: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.HUBSPOT_API_BASE_URL}/settings/v3/users`);

  url.searchParams.append('limit', String(`${env.HUBSPOT_USERS_SYNC_BATCH_SIZE}`));

  if (page) {
    url.searchParams.append('after', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = hubspotResponseSchema.parse(resData);

  const validUsers: HubspotUser[] = [];
  const invalidUsers: unknown[] = [];

  // TODO: Users should be filtered by status (active, inactive, pending)
  // Still we don't have any properties available in the API to filter the inactive and pending users
  // Community: https://community.hubspot.com/t5/HubSpot-Ideas/Activate-and-Deactivate-users-via-API/idc-p/992350#M182790
  for (const user of result.results) {
    const userResult = hubspotUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.paging?.next?.after ?? null,
  };
};

const hubspotAuthUserSchema = z.object({
  user: z.string().min(1),
  user_id: z.number().min(1),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.HUBSPOT_API_BASE_URL}/oauth/v1/access-tokens/${accessToken}`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError(`Couldn't get the auth user details`, { response });
  }

  const resData: unknown = await response.json();

  const result = hubspotAuthUserSchema.safeParse(resData);

  if (!result.success) {
    throw new IntegrationError("Couldn't get the auth user details", { response });
  }

  return {
    authUserId: String(result.data.user_id),
  };
};

export const deleteUser = async ({ accessToken, userId }: DeleteUsersParams) => {
  const url = new URL(`${env.HUBSPOT_API_BASE_URL}/settings/v3/users/${userId}`);
  url.searchParams.append('idProperty', 'USER_ID');

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError(`Could not delete user with Id: ${userId}`, { response });
  }
};

const getAccountInfoResponseSchema = z.object({
  timeZone: z.string(),
  portalId: z.number().int().min(0),
  uiDomain: z.string(),
});

export const getAccountInfo = async (token: string) => {
  const response = await fetch(`${env.HUBSPOT_API_BASE_URL}/account-info/v3/details`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError('Could not retrieve account info', { response });
  }
  const data: unknown = await response.json();

  const result = getAccountInfoResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Could not validate account info response data', { data, error: result.error });
    throw new Error('Could not validate account info response data', { cause: result.error });
  }

  return result.data;
};
