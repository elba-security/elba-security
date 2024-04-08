import { z } from 'zod';
import { env } from '@/env';
import { getDbtlabsApiClient } from '@/common/apiclient';
import { DbtlabsError } from './commons/error';

const dbtlabsUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  fullname: z.string(),
  email: z.string(),
  is_active: z.boolean(),
});

export type DbtlabsUser = z.infer<typeof dbtlabsUserSchema>;

const dbtlabsResponseSchema = z.object({
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
  personalToken: string;
  accountId: string;
  dbtRegion: string;
  afterToken?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  personalToken: string;
  dbtRegion: string;
};

export type GetAccountsParams = {
  personalToken: string;
  dbtRegion: string;
};

type AccountInfo = {
  id: number;
  name: string;
  plan: string;
  pending_cancel: boolean;
};

type GetAccountIdResponseData = { data: AccountInfo[] };

export const getUsers = async ({
  personalToken,
  accountId,
  afterToken,
  dbtRegion,
}: GetUsersParams) => {
  const endpoint =
    dbtRegion === 'us'
      ? new URL(`${env.DBTLABS_API_US_BASE_URL}accounts/${accountId}/users`)
      : new URL(`${env.DBTLABS_API_EU_BASE_URL}accounts/${accountId}/users`);
  if (afterToken) {
    endpoint.searchParams.append('offset', String(afterToken));
  }

  const dbtlabsApiClient = getDbtlabsApiClient();

  const resData: unknown = await dbtlabsApiClient.get(endpoint.toString(), personalToken);

  const { data, extra } = dbtlabsResponseSchema.parse(resData);

  const validUsers: DbtlabsUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = dbtlabsUserSchema.safeParse(node);
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

export const getAccountId = async ({ personalToken, dbtRegion }: GetAccountsParams) => {
  const dbtlabsApiClient = getDbtlabsApiClient();
  const endpoint = dbtRegion === 'us' ? `${env.DBTLABS_API_US_BASE_URL}accounts` : `${env.DBTLABS_API_EU_BASE_URL}accounts`;

  const { data: accounts } = (await dbtlabsApiClient.get(
    endpoint,
    personalToken
  )) as GetAccountIdResponseData;

  if (!accounts[0]) {
    throw new DbtlabsError('Could not retrieve account id');
  }
  const { id: accountId } = accounts[0];

  return {
    accountId: accountId.toString(),
  };
};
