import { z } from 'zod';
import { env } from '@/env';
import { getElasticApiClient } from '@/common/apiclient';
import { ElasticError } from './commons/error';

const elasticUserSchema = z.object({
  user_id: z.string(),
  name: z.string().optional(),
  email: z.string(),
  role_assignments: z.object({
    organization: z
      .array(
        z.object({
          role_id: z.string(),
        })
      )
      .optional(),
    deployment: z.array(z.unknown()).optional(),
  }),
});

export type ElasticUser = z.infer<typeof elasticUserSchema>;

const elasticResponseSchema = z.object({
  members: z.array(z.unknown()),
  from: z.number().optional(),
});

export type GetUsersParams = {
  apiKey: string;
  accountId: string;
  afterToken?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accountId: string;
  apiKey: string;
};

export type GetAccountsParams = {
  apiKey: string;
};

type AccountInfo = {
  id: number;
  name: string;
};

type GetAccountIdResponseData = { organizations: AccountInfo[] };

export const getUsers = async ({ apiKey, accountId, afterToken }: GetUsersParams) => {
  const endpoint = new URL(`${env.ELASTIC_API_BASE_URL}organizations/${accountId}/members`);

  if (afterToken) {
    endpoint.searchParams.append('from', String(afterToken));
  }

  const elasticApiClient = getElasticApiClient();

  const resData: unknown = await elasticApiClient.get(endpoint.toString(), apiKey);

  const { members, from } = elasticResponseSchema.parse(resData);

  const validUsers: ElasticUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of members) {
    const result = elasticUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: from ? (from + 1).toString() : null,
  };
};

export const getAccountId = async ({ apiKey }: GetAccountsParams) => {
  const elasticApiClient = getElasticApiClient();
  const endpoint = `${env.ELASTIC_API_BASE_URL}organizations`;

  const { organizations: accounts } = (await elasticApiClient.get(
    endpoint,
    apiKey
  )) as GetAccountIdResponseData;

  if (!accounts[0]) {
    throw new ElasticError('Could not retrieve account id');
  }
  const { id: accountId } = accounts[0];

  return {
    accountId: accountId.toString(),
  };
};

export const deleteUser = async ({ userId, accountId, apiKey }: DeleteUsersParams) => {
  const url = `${env.ELASTIC_API_BASE_URL}organizations/${accountId}/members/${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
  });
  const elasticErrorDataSchema = z.object({
    errors: z.array(
      z.object({
        code: z.string().nullish(),
        message: z.string().nullish(),
      })
    ),
  });
  if (response.status === 400) {
    const errorDataResult = elasticErrorDataSchema.safeParse(await response.json());
    if (
      errorDataResult.success &&
      errorDataResult.data.errors.at(0)?.code === 'organization.membership_not_found'
    ) {
      return;
    }
  }

  if (!response.ok) {
    throw new ElasticError(`Could not delete user with Id: ${userId}`, { response });
  }
};
