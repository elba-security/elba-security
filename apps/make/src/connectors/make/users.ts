import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';

const makeUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  language: z.string(),
  timezoneId: z.number(),
  localeId: z.number(),
  countryId: z.number(),
  features: z.record(z.unknown()).optional(),
  avatar: z.string().optional(),
  lastLogin: z.string().nullable().optional(),
});

export type MakeUser = z.infer<typeof makeUserSchema>;

const makeResponseSchema = z.object({
  users: z.array(z.unknown()),
  pg: z.object({
    limit: z.number(),
    offset: z.number(),
    totalCount: z.number(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  organizationId: string;
  baseUrl: string;
  page?: number;
  zone?: string; // Optional zone URL for the organization
};

export type DeleteUsersParams = {
  userId: string;
  organizationId: string;
  accessToken: string;
  baseUrl: string;
};

export const getUsers = async ({
  accessToken,
  organizationId,
  baseUrl,
  page = 0,
  zone,
}: GetUsersParams) => {
  // Use zone-specific URL if provided, otherwise use the base URL
  const apiUrl = zone ? `https://${zone}/api/v2` : baseUrl;
  const url = new URL(`${apiUrl}/users`);

  url.searchParams.append('organizationId', organizationId);
  url.searchParams.append('pg[limit]', String(env.MAKE_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('pg[offset]', String(page * env.MAKE_USERS_SYNC_BATCH_SIZE));

  logger.info('Fetching Make users', {
    url: url.toString(),
    organizationId,
    page,
    limit: env.MAKE_USERS_SYNC_BATCH_SIZE,
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${accessToken}`,
    },
  });

  if (!response.ok) {
    logger.error('Failed to fetch Make users', {
      status: response.status,
      statusText: response.statusText,
      url: url.toString(),
      organizationId,
    });

    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, pg } = makeResponseSchema.parse(resData);

  const validUsers: MakeUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = makeUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  const hasNextPage = pg.offset + pg.limit < pg.totalCount;
  const nextPage = hasNextPage ? page + 1 : null;

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};

export const removeUserFromOrganization = async ({
  userId,
  organizationId,
  accessToken,
  baseUrl,
}: DeleteUsersParams) => {
  const url = new URL(`${baseUrl}/organizations/${organizationId}/users/${userId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Token ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError(
      `Could not remove user ${userId} from organization ${organizationId}`,
      { response }
    );
  }
};

const authUserResponseSchema = z.object({
  authUser: z.object({
    id: z.number(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export const getAuthUser = async (accessToken: string, baseUrl: string) => {
  const url = new URL(`${baseUrl}/users/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    throw new IntegrationError('Could not retrieve authenticated user', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Make auth user response', { resData, error: result.error });
    throw new IntegrationConnectionError('Invalid Make authenticated user response', {
      type: 'unknown',
      metadata: { data: resData, errors: result.error.issues },
    });
  }

  return {
    authUserId: String(result.data.authUser.id),
  };
};

const makeOrganizationSchema = z.object({
  id: z.number(),
  name: z.string(),
  zone: z.string().optional(), // e.g., "eu2.make.com" or "us1.make.com"
});

export type MakeOrganization = z.infer<typeof makeOrganizationSchema>;

const organizationsResponseSchema = z.object({
  organizations: z.array(makeOrganizationSchema),
});

export const getOrganizations = async (accessToken: string, baseUrl: string) => {
  const url = new URL(`${baseUrl}/organizations`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Token ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }

    throw new IntegrationError('Could not retrieve organizations', { response });
  }

  const resData: unknown = await response.json();

  const result = organizationsResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Make organizations response', { resData, error: result.error });
    throw new IntegrationError('Invalid Make organizations response', { response });
  }

  return result.data.organizations;
};
