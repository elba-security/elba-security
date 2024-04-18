import { z } from 'zod';
import { env } from '@/env';
import { JiraError } from './commons/error';

const zUserSchema = z.object({
  accountId: z.string(),
  accountType: z.enum(['atlassian', 'app', 'customer', 'unknown']).optional(),
  active: z.boolean().optional(),
  displayName: z.string(),
  emailAddress: z.string().optional(),
  expand: z.string().optional(),
  groups: z
    .object({
      items: z.array(
        z.object({
          groupId: z.string().optional(),
          name: z.string().optional(),
          self: z.string().optional(),
        })
      ),
      size: z.number().optional(),
    })
    .optional(),
  locale: z.string().optional(),
  self: z.string().optional(),
  timeZone: z.string().optional(),
});

export type JiraUser = z.infer<typeof zUserSchema>;

export type GetUsersParams = {
  accessToken: string;
  cloudId: string;
  startAt: number;
};

export type DeleteUsersParams = {
  accessToken: string;
  cloudId: string;
  userId: string;
};

export const getUsers = async ({ accessToken, cloudId, startAt }: GetUsersParams) => {
  const url = new URL(`${env.JIRA_API_BASE_URL}/${cloudId}/rest/api/3/users`);
  url.searchParams.append('startAt', startAt.toString());
  url.searchParams.append('maxResults', env.USERS_SYNC_BATCH_SIZE.toString());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new JiraError('Could not retrieve users', { response });
  }

  const data = (await response.json()) as unknown[];

  const startAtNext =
    data.length >= env.USERS_SYNC_BATCH_SIZE ? startAt + env.USERS_SYNC_BATCH_SIZE : null;

  const validUsers: JiraUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data) {
    const result = zUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return { validUsers, invalidUsers, startAtNext };
};

export const deleteUser = async ({ userId, accessToken, cloudId, }: DeleteUsersParams) => {
  const url = `${env.JIRA_API_BASE_URL}/${cloudId}/rest/api/3/user?accountId=${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new JiraError(`Could not delete user with Id: ${userId}`, { response });
  }
};