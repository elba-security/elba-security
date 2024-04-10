import { z } from 'zod';
import { env } from '@/env';
import { getElasticApiClient } from '@/common/apiclient';
import { ElasticError } from './commons/error';

const elasticUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  fullname: z.string(),
  email: z.string(),
  is_active: z.boolean(),
});

export type ElasticUser = z.infer<typeof elasticUserSchema>;

const elasticResponseSchema = z.object({
  data: z.array(z.unknown()),
  extra: z.object({
    filters: z.object({
      limit: z.number().nullable(),
      offset: z.number().nullable(),
    }),
    pagination: z.object({
      count: z.number().nullable(),
      total_count: z.number().nullable(),
    }),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  accountId: string;
  afterToken?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
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

  const { data, extra } = elasticResponseSchema.parse(resData);

  const validUsers: ElasticUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = elasticUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  let nextPage: string | null = null;
  const { limit, offset } = extra.filters;
  const { total_count: totalCount } = extra.pagination;

  // Calculate if there is a next page based on the current offset, limit, and total count
  if (limit && offset && totalCount) {
    const nextOffset = offset + limit;
    if (nextOffset < totalCount) {
      nextPage = nextOffset.toString();
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
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
