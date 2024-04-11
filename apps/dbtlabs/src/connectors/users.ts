import { z } from 'zod';
import { getDbtlabsApiClient } from '@/common/apiclient';

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
  serviceToken: string;
  accountId: string;
  accessUrl: string;
  afterToken?: string | null;
};

export const getUsers = async ({ serviceToken, accountId, afterToken, accessUrl }: GetUsersParams) => {
  const endpoint = new URL(`${accessUrl}/api/v2/accounts/${accountId}/users`)
  if (afterToken) {
    endpoint.searchParams.append('offset', String(afterToken));
  }

  const dbtlabsApiClient = getDbtlabsApiClient();

  const resData: unknown = await dbtlabsApiClient.get(endpoint.toString(), serviceToken);

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

