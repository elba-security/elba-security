import { z } from 'zod';
import { env } from '@/common/env';
import { DatadogError } from '../common/error';

const datadogUserSchema = z.object({
  id: z.string().min(1),
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
      after: z.string().optional(),
    }),
  }),
});

export type GetUsersParams = {
  apiKey: string;
  appKey: string;
  sourceRegion: string;
  afterCursor?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  appKey: string;
  sourceRegion: string;
  apiKey: string;
};

export const getUsers = async ({ apiKey, appKey, sourceRegion, afterCursor }: GetUsersParams) => {
  const url = new URL(
    sourceRegion === 'US'
      ? `${env.DATADOG_US_API_BASE_URL}/api/v2/users`
      : `${env.DATADOG_EU_API_BASE_URL}/api/v2/users`
  );

  if (afterCursor) {
    url.searchParams.append('page[cursor]', String(afterCursor));
  }

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
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: meta.page.after ? meta.page.after : null,
  };
};

export const deleteUser = async ({ apiKey, appKey, sourceRegion, userId }: DeleteUsersParams) => {
  const url = new URL(
    sourceRegion === 'US'
      ? `${env.DATADOG_US_API_BASE_URL}/api/v2/users`
      : `${env.DATADOG_EU_API_BASE_URL}/api/v2/users`
  );

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'DD-API-KEY': apiKey,
      'DD-APPLICATION-KEY': appKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new DatadogError(`Could not delete user with Id: ${userId}`, { response });
  }
};
