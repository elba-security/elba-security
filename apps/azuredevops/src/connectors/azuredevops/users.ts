import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { AzuredevopsError } from '../common/error';

const getUsersResponseSchema = z.object({
  value: z.array(z.unknown()),
  continuationToken: z.string().optional(),
});

export const azuredevopsUserSchema = z.object({
  mailAddress: z.string(),
  origin: z.literal('msa'),
  displayName: z.string(),
  descriptor: z.string(),
  subjectKind: z.literal('user'), // user
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
  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/graph/users`);
  url.searchParams.append('api-version', `7.2-preview.1`);
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

  for (const user of result.value) {
    const userResult = azuredevopsUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.continuationToken ?? null,
  };
};

export const deleteUser = async ({ userId, accessToken, workspaceId }: DeleteUsersParams) => {
  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/graph/users/${userId}`);

  url.searchParams.append('api-version', `7.2-preview.1`);
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
  const url = new URL(`${env.AZUREDEVOPS_API_BASE_URL}/${workspaceId}/_apis/graph/users`);
  url.searchParams.append('api-version', `7.2-preview.1`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  return {
    isInvalidSecuritySetting: !response.ok && response.status === 401,
  };
};
