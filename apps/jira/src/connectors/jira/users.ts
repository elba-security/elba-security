import { z } from 'zod';
import { env } from '@/common/env';
import { JiraError } from '../common/error';

const jiraUserSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  active: z.boolean().optional(),
  emailAddress: z.string().optional(),
});

export type JiraUser = z.infer<typeof jiraUserSchema>;

const jiraResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  accessToken: string;
  cloudId: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  cloudId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, cloudId, page }: GetUsersParams) => {
  const url = new URL(`${env.JIRA_API_BASE_URL}ex/jira/${cloudId}/rest/api/3/users`);

  url.searchParams.append('maxResults', String(env.JIRA_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('startAt', String(page));
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const users = jiraResponseSchema.parse(resData);
  const startAtNext =
    users.length >= env.JIRA_USERS_SYNC_BATCH_SIZE && page
      ? parseInt(page, 10) + env.JIRA_USERS_SYNC_BATCH_SIZE
      : null;

  const validUsers: JiraUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = jiraUserSchema.safeParse(user);
    if (result.success) {
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

export const deleteUser = async ({ userId, cloudId, accessToken }: DeleteUsersParams) => {
  const url = new URL(
    `${env.JIRA_API_BASE_URL}ex/jira/${cloudId}/rest/api/3/user?accountId=${userId}`
  );

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new JiraError(`Could not delete user with Id: ${userId}`, { response });
  }
};
