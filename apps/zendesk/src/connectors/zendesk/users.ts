import { z } from 'zod';
import { env } from '@/common/env';
import { ZendeskError } from '../common/error';

const zendeskUserSchema = z.object({
  data: z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    status: z.string(), // We only want active users
    role: z.string(),
  }),
  meta: z.object({
    type: z.literal('user'),
  }),
});

export type ZendeskUser = z.infer<typeof zendeskUserSchema>;

const zendeskResponseSchema = z.object({
  items: z.array(z.unknown()),
  meta: z.object({
    links: z
      .object({
        next_page: z.string().optional(),
      })
      .optional(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.ZENDESK_API_BASE_URL}/v2/users`);

  url.searchParams.append('per_page', String(env.ZENDESK_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('page', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ZendeskError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const { items, meta } = zendeskResponseSchema.parse(resData);

  const validUsers: ZendeskUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of items) {
    const userResult = zendeskUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: meta.links?.next_page ? meta.links.next_page : null,
  };
};
