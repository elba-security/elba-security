import { z } from 'zod';
import { env } from '@/common/env';
import { HubspotError } from '../common/error';

const hubspotUserSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
});

export type HubspotUser = z.infer<typeof hubspotUserSchema>;

const hubspotResponseSchema = z.object({
  results: z.array(z.unknown()),
  paging: z
    .object({
      next: z
        .object({
          after: z.string(),
        })
        .optional(),
    })
    .optional(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
  workspaceId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.HUBSPOT_API_BASE_URL}/settings/v3/users`);

  url.searchParams.append('limit', String(`${env.HUBSPOT_USERS_SYNC_BATCH_SIZE}`));

  if (page) {
    url.searchParams.append('after', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HubspotError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const result = hubspotResponseSchema.parse(resData);

  const validUsers: HubspotUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result.results) {
    const userResult = hubspotUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: result.paging?.next?.after ?? null,
  };
};
