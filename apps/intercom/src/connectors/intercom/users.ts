import { z } from 'zod';
import { env } from '@/common/env';
import { IntercomError } from '../common/error';

const intercomUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().optional(),
});

export type IntercomUser = z.infer<typeof intercomUserSchema>;

const intercomResponseSchema = z.object({
  pages: z
    .object({
      page: z.number().nullable(),
      per_page: z.number().nullable(),
      next: z
        .object({
          starting_after: z.string().nullable(),
        })
        .optional(),
    })
    .optional(),
  admins: z.array(z.unknown()),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.INTERCOM_API_BASE_URL}/admins`);

  // Based on this documentation, pagination is optional
  // https://developers.intercom.com/docs/references/1.0/rest-api/admins/list-admins/#admin-list

  if (page) {
    url.searchParams.append('per_page', String(env.INTERCOM_USERS_SYNC_BATCH_SIZE));
    url.searchParams.append('starting_after', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Intercom-Version': '2.11',
    },
  });

  if (!response.ok) {
    throw new IntercomError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { admins, pages } = intercomResponseSchema.parse(resData);

  const validUsers: IntercomUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of admins) {
    const userResult = intercomUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: pages?.next ? pages.next.starting_after : null,
  };
};
