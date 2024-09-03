import { z } from 'zod';
import { env } from '@/common/env';
import { DatadogError } from '../common/error';
import { getDatadogRegionAPIBaseURL } from './regions';

const datadogUserSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  attributes: z.object({
    name: z.string(),
    email: z.string(),
    status: z.string().min(1),
    mfa_enabled: z.boolean(),
  }),
});

export type DatadogUser = z.infer<typeof datadogUserSchema>;

const datadogResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    page: z.object({
      total_count: z.number(),
      total_filtered_count: z.number(),
    }),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  appKey: string;
  sourceRegion: string;
  page: number;
};

export type DeleteUsersParams = {
  userId: string;
  appKey: string;
  sourceRegion: string;
  apiKey: string;
};

const pageSize = env.DATADOG_USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ apiKey, appKey, sourceRegion, page = 0 }: GetUsersParams) => {
  const url = new URL(`${getDatadogRegionAPIBaseURL(sourceRegion)}/api/v2/users`);
  url.searchParams.append('filter[status]', 'Active');
  url.searchParams.append('page[size]', String(pageSize));
  url.searchParams.append('page[number]', String(page));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
    },
  });

  if (!response.ok) {
    throw new DatadogError('Could not retrieve Datadog users', { response });
  }

  const resData: unknown = await response.json();

  const { data, meta } = datadogResponseSchema.parse(resData);

  const validUsers: DatadogUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data) {
    const result = datadogUserSchema.safeParse(user);
    if (result.success) {
      // We are only interested in active users
      if (result.data.type !== 'users' || result.data.attributes.status !== 'Active') {
        continue;
      }

      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }
  const totalFilteredCount = meta.page.total_filtered_count;

  return {
    validUsers,
    invalidUsers,
    nextPage: (page + 1) * pageSize < totalFilteredCount ? page + 1 : null,
  };
};

type GetAuthUser = {
  apiKey: string;
  appKey: string;
  sourceRegion: string;
};

const authUserResponseSchema = z.object({
  data: z.object({
    id: z.string(),
  }),
});

export const getAuthUser = async ({ apiKey, appKey, sourceRegion }: GetAuthUser) => {
  const url = new URL(`${getDatadogRegionAPIBaseURL(sourceRegion)}/api/v2/current_user`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
    },
  });

  if (!response.ok) {
    throw new DatadogError('Could not retrieve Datadog users', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new DatadogError('Could not retrieve Datadog users', { response });
  }

  return {
    authUserId: result.data.data.id,
  };
};

export const deleteUser = async ({ apiKey, appKey, sourceRegion, userId }: DeleteUsersParams) => {
  const url = new URL(`${getDatadogRegionAPIBaseURL(sourceRegion)}/api/v2/users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
    },
    body: JSON.stringify({
      data: {
        attributes: {
          disabled: true,
        },
        id: userId,
        type: 'users',
      },
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new DatadogError(`Could not delete user with Id: ${userId}`, { response });
  }
};
