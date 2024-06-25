import { z } from 'zod';
import { env } from '@/common/env';
import { SalesforceError } from '../common/error';

const salesforceUserSchema = z.object({
  attributes: z.object({
    type: z.string().min(1),
  }),
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
  const url = new URL(
    `/services/data/v60.0/query/?q=SELECT+Id,+Name,+Email,+IsActive+FROM+User+limit+${limit}+offset+${offset}`,
    instanceUrl
  );

  const response = await fetch(url.toString(), {
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
      if (result.data.attributes.type !== 'User') {
        continue;
      }

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
  const url = new URL(`/services/data/v60.0/sobjects/User/${userId}`, instanceUrl);

  const response = await fetch(url.toString(), {
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
