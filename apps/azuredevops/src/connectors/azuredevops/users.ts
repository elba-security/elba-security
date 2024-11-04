import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AzuredevopsError } from '../common/error';

const getUsersResponseSchema = z.object({
  items: z.array(z.unknown()),
  continuationToken: z.string().nullable(),
});

export const azuredevopsUserSchema = z.object({
  id: z.string().min(1),
  user: z.object({
    mailAddress: z.string(),
    origin: z.string(),
    displayName: z.string(),
    subjectKind: z.string(),
  }), // Group, Scope, User
  accessLevel: z.object({
    status: z.string(),
  }),
});

export type AzuredevopsUser = z.infer<typeof azuredevopsUserSchema>;

type GetUsersParams = {
  accessToken: string;
  workspaceId: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  workspaceId: string;
};

type CheckWorkspaceSettingParams = {
  accessToken: string;
  workspaceId: string;
};

export const getUsers = async ({ accessToken, workspaceId, page }: GetUsersParams) => {
  // There are two API to list the users in Azure DevOps
  // https://learn.microsoft.com/en-us/rest/api/azure/devops/graph/users/list?view=azure-devops-rest-7.1&tabs=HTTP
  // https://learn.microsoft.com/en-us/rest/api/azure/devops/memberentitlementmanagement/user-entitlements/search-user-entitlements?view=azure-devops-rest-7.2#accesslevel
  // however, the first one does not return the complete user list only 2 actual users returned, so we are using the second one

  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/userentitlements`);
  url.searchParams.append('api-version', `7.2-preview.4`);

  if (page) {
    url.searchParams.append('continuationToken', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new AzuredevopsError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = getUsersResponseSchema.parse(resData);

  const validUsers: AzuredevopsUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.items) {
    const userResult = azuredevopsUserSchema.safeParse(user);
    if (userResult.success) {
      const { subjectKind, origin } = userResult.data.user;
      if (
        subjectKind !== 'user' ||
        !['aad', 'msa'].includes(origin) ||
        userResult.data.accessLevel.status !== 'active'
      ) {
        continue;
      }

      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.continuationToken || null,
  };
};

export const deleteUser = async ({ accessToken, workspaceId, userId }: DeleteUsersParams) => {
  const url = new URL(
    `${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/userentitlements/${userId}`
  );

  url.searchParams.append('api-version', `7.2-preview.4`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new AzuredevopsError(`Could not delete user with Id: ${userId}`, { response });
  }
};

const authUserIdResponseSchema = z.object({
  emailAddress: z.string(),
});

export const getAuthUser = async (accessToken: string) => {
  const url = new URL(`${env.AZUREDEVOPS_APP_INSTALL_URL}/_apis/profile/profiles/me`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AzuredevopsError('Could not retrieve auth user id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Azuredevops auth user response', { resData });
    throw new AzuredevopsError('Invalid Azuredevops auth user response');
  }

  return {
    authUserEmail: String(result.data.emailAddress),
  };
};

export const checkWorkspaceSetting = async ({
  accessToken,
  workspaceId,
}: CheckWorkspaceSettingParams) => {
  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/userentitlements`);
  url.searchParams.append('api-version', `7.2-preview.4`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  return {
    hasValidSecuritySettings: response.ok,
  };
};
