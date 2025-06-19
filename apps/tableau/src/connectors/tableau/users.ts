import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationConnectionError, IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';

const tableauUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  email: z.string().email(),
  siteRole: z.string(),
  authSetting: z.string().optional(),
});

export type TableauUser = z.infer<typeof tableauUserSchema>;

const tableauPaginationSchema = z.object({
  pageNumber: z.string(),
  pageSize: z.string(),
  totalAvailable: z.string(),
});

const tableauResponseSchema = z.object({
  user: z.array(tableauUserSchema),
  pagination: tableauPaginationSchema,
});

export type GetUsersParams = {
  serverUrl: string;
  siteId: string;
  accessToken: string;
  page?: string | null;
};

export type DeleteUserParams = {
  serverUrl: string;
  siteId: string;
  accessToken: string;
  userId: string;
};

export const getUsers = async ({ serverUrl, siteId, accessToken, page }: GetUsersParams) => {
  const pageNumber = page || '1';
  const url = new URL(`${serverUrl}/api/3.15/sites/${siteId}/users`);

  url.searchParams.append('pageSize', String(env.TABLEAU_USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('pageNumber', pageNumber);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Tableau-Auth': accessToken,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = tableauResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Tableau users response', { resData, error: result.error });
    throw new IntegrationError('Invalid Tableau response format', {});
  }

  const { user: users, pagination } = result.data;
  const currentPage = parseInt(pagination.pageNumber, 10);
  const pageSize = parseInt(pagination.pageSize, 10);
  const totalAvailable = parseInt(pagination.totalAvailable, 10);
  const totalPages = Math.ceil(totalAvailable / pageSize);

  return {
    validUsers: users,
    invalidUsers: [],
    nextPage: currentPage < totalPages ? String(currentPage + 1) : null,
  };
};

export const deleteUser = async ({ serverUrl, siteId, accessToken, userId }: DeleteUserParams) => {
  const url = new URL(`${serverUrl}/api/3.15/sites/${siteId}/users/${userId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-Tableau-Auth': accessToken,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError(`Could not delete user with Id: ${userId}`, { response });
  }
};

const authResponseSchema = z.object({
  user: tableauUserSchema,
});

export const getAuthUser = async (serverUrl: string, siteId: string, accessToken: string) => {
  const url = new URL(`${serverUrl}/api/3.15/sites/${siteId}/users/me`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Tableau-Auth': accessToken,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError('Could not retrieve authenticated user', { response });
  }

  const resData: unknown = await response.json();

  const result = authResponseSchema.safeParse(resData);

  if (!result.success) {
    logger.error('Invalid Tableau auth user response', { resData, error: result.error });
    throw new IntegrationConnectionError('Invalid Tableau authenticated user response', {
      type: 'unknown',
      metadata: { data: resData, errors: result.error.issues },
    });
  }

  // Check if user has admin permissions
  const adminRoles = [
    'ServerAdministrator',
    'SiteAdministratorCreator',
    'SiteAdministratorExplorer',
  ];
  if (!adminRoles.includes(result.data.user.siteRole)) {
    throw new IntegrationConnectionError('Authenticated user is not an administrator', {
      type: 'not_admin',
      metadata: result.data,
    });
  }

  return {
    authUserId: result.data.user.id,
    siteRole: result.data.user.siteRole,
  };
};
