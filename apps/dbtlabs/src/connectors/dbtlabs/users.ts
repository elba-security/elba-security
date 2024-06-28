import { z } from 'zod';
import { env } from '@/common/env';
import { DbtlabsError } from '../common/error';

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
    filters: z
      .object({
        limit: z.number(),
        offset: z.number(),
      })
      .optional(),
    pagination: z
      .object({
        count: z.number(),
        total_count: z.number(),
      })
      .optional(),
  }),
});

export type GetUsersParams = {
  serviceToken: string;
  accountId: string;
  accessUrl: string;
  page: number | null;
};

export const getUsers = async ({ serviceToken, accountId, page, accessUrl }: GetUsersParams) => {
  // V3 version of the API is available, however, it is in beta , we can use once it is stable
  const url = new URL(`${accessUrl}/api/v2/accounts/${accountId}/users`);
  url.searchParams.append('limit', String(env.DBTLABS_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('offset', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
  });

  if (!response.ok) {
    throw new DbtlabsError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { data, extra } = dbtlabsResponseSchema.parse(resData);

  const validUsers: DbtlabsUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = dbtlabsUserSchema.safeParse(node);
    if (result.success) {
      //Api will not return invited users but we need ot filter inactive users
      if (!result.data.is_active) {
        continue;
      }
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  let nextPage: number | null = null;

  if (extra.filters && extra.pagination) {
    const {
      filters: { limit, offset },
      pagination: { total_count: totalCount },
    } = extra;

    const nextOffset = offset + limit;

    if (nextOffset < totalCount) {
      nextPage = nextOffset;
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};
