import { z } from 'zod';
import { env } from '@/common/env';
import { SalesforceError } from '../common/error';

const salesforceUserSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Email: z.string(),
  IsActive: z.boolean(),
  UserType: z.string(),
  Profile: z
    .object({
      Id: z.string(),
      Name: z.string(),
    })
    .nullable(),
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
  const query = `SELECT Id, Name, Email, UserType, IsActive, Profile.Id, Profile.Name FROM User LIMIT ${limit} OFFSET ${offset}`;

  const url = new URL(`${instanceUrl}/services/data/v60.0/query`);
  url.searchParams.append('q', query);

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
      if (result.data.UserType !== 'Standard' || !result.data.IsActive) {
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

const salesforceAuthUserSchema = z.object({
  user_id: z.string().min(1),
  active: z.boolean(),
});

export const getAuthUser = async ({
  accessToken,
  instanceUrl,
}: {
  accessToken: string;
  instanceUrl: string;
}) => {
  const url = new URL(`${instanceUrl}/services/oauth2/userinfo`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SalesforceError(`Couldn't get the user details`, { response });
  }

  const data: unknown = await response.json();

  const result = salesforceAuthUserSchema.safeParse(data);

  if (!result.success) {
    throw new SalesforceError('Invalid user data', { response });
  }

  if (!result.data.active) {
    throw new SalesforceError('User is not active', { response });
  }

  return {
    userId: result.data.user_id,
  };
};
