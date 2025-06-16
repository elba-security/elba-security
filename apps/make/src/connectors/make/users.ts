import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';

const makeUserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  timezone: z.string(),
  country: z.string(),
  language: z.string(),
  isActive: z.boolean(),
  roles: z.array(
    z.object({
      organizationId: z.number(),
      organizationName: z.string(),
      role: z.string(),
    })
  ),
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
  page?: number;
};

export type DeleteUsersParams = {
  userId: string;
  organizationId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, organizationId, page = 0 }: GetUsersParams) => {
  const url = new URL(`${env.MAKE_API_BASE_URL}/organizations/${organizationId}/users`);

  url.searchParams.append('pg[limit]', String(env.MAKE_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('pg[offset]', String(page * env.MAKE_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(url, {
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
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users, pg } = makeResponseSchema.parse(resData);

  const validUsers: MakeUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = makeUserSchema.safeParse(user);
    if (result.success) {
      // Only include active users
      if (!result.data.isActive) {
        continue;
      }

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
}: DeleteUsersParams) => {
  const url = new URL(`${env.MAKE_API_BASE_URL}/organizations/${organizationId}/users/${userId}`);

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
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.MAKE_API_BASE_URL}/users/me`);

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
    authUserId: String(result.data.id),
  };
};

const organizationsResponseSchema = z.object({
  organizations: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
    })
  ),
});

export const getOrganizations = async (accessToken: string) => {
  const url = new URL(`${env.MAKE_API_BASE_URL}/organizations`);

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
