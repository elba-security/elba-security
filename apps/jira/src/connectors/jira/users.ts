import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

const jiraUserSchema = z.object({
  accountId: z.string().min(1),
  displayName: z.string(),
  active: z.boolean().optional(),
  emailAddress: z.string().optional(),
  accountType: z.string().min(1),
});

export type JiraUser = z.infer<typeof jiraUserSchema>;

const jiraResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  accessToken: string;
  domain: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  domain: string;
  accessToken: string;
};

export type GetAuthUserParams = {
  domain: string;
  accessToken: string;
};

const authUserIdResponseSchema = z.object({
  accountId: z.string(),
});

export const getUsers = async ({ accessToken, domain, page }: GetUsersParams) => {
  const url = new URL(`https://${domain}.atlassian.net/rest/api/3/users/search`);

  url.searchParams.append('maxResults', String(env.JIRA_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('startAt', String(page));
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
    throw new IntegrationError('Could not retrieve Jira users', { response });
  }

  const resData: unknown = await response.json();

  const users = jiraResponseSchema.parse(resData);
  const startAtNext =
    users.length === env.JIRA_USERS_SYNC_BATCH_SIZE
      ? parseInt(page || '0', 10) + env.JIRA_USERS_SYNC_BATCH_SIZE
      : null;

  const validUsers: JiraUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = jiraUserSchema.safeParse(user);
    if (result.success && result.data.accountType === 'atlassian' && result.data.active) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: startAtNext,
  };
};

export const deleteUser = async ({ accessToken, domain, userId }: DeleteUsersParams) => {
  const url = new URL(`https://${domain}.atlassian.net/rest/api/3/user`);
  url.searchParams.append('accountId', userId);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
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

export const getAuthUser = async ({ accessToken, domain }: GetAuthUserParams) => {
  const url = new URL(`https://${domain}.atlassian.net/rest/api/3/myself`);

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
    throw new IntegrationError('Could not retrieve authUser id', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Jira authUser id response', { resData });
    throw new IntegrationError('Invalid Jira authUser id response', {});
  }

  return {
    authUserId: String(result.data.accountId),
  };
};
