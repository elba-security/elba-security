import { z } from 'zod';
import { env } from '@/common/env';
import { SalesforceError } from '../common/error';

const salesforceUserSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Email: z.string(),
  IsActive: z.boolean(),
});

export type SalesforceUser = z.infer<typeof salesforceUserSchema>;

const salesforceResponseSchema = z.object({
  totalSize: z.number(),
  records: z.array(z.unknown()),
});

export type GetUsersParams = {
  accessToken: string;
  instanceUrl: string;
  offset: number;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
  instanceUrl: string;
};

const limit = env.SALESFORCE_USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ accessToken, instanceUrl, offset }: GetUsersParams) => {
  const endpoint = `${instanceUrl}/services/data/v60.0/query/?q=SELECT+Id,+Name,+Email,+IsActive+FROM+User+limit+${limit}+offset+${offset}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SalesforceError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const { records, totalSize } = salesforceResponseSchema.parse(data);
  const validUsers: SalesforceUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const record of records) {
    const result = salesforceUserSchema.safeParse(record);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(record);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: totalSize < limit ? null : limit + offset,
  };
};

export const deleteUser = async ({ accessToken, instanceUrl, userId }: DeleteUsersParams) => {
  const url = `${instanceUrl}/services/data/v60.0/sobjects/User/${userId}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      IsActive: false,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new SalesforceError(`Could not delete user with Id: ${userId}`, { response });
  }
};
