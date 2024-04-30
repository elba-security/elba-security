import { z } from 'zod';
import { env } from '@/common/env';
import { LivestormError } from '../common/error';

const livestormUserSchema = z.object({
  id: z.string(),
  type: z.literal('users'), // it should be always 'users'
  attributes: z.object({
    role: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    email: z.string(),
    pending_invite: z.boolean(),
  }),
});

export type LivestormUser = z.infer<typeof livestormUserSchema>;

const livestormResponseSchema = z.object({
  data: z.array(z.unknown()),
  meta: z.object({
    next_page: z.number().nullable(),
  }),
});

export const getUsers = async (token: string, page: number | null) => {
  const url = new URL(`${env.LIVESTORM_API_BASE_URL}/users`);

  url.searchParams.append('page[size]', String(env.LIVESTORM_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('page[number]', String(page));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      Authorization: token,
    },
  });

  if (!response.ok) {
    throw new LivestormError('Could not retrieve Livestorm users', { response });
  }

  const resData: unknown = await response.json();
  const validUsers: LivestormUser[] = [];
  const invalidUsers: unknown[] = [];

  const { data, meta } = livestormResponseSchema.parse(resData);

  for (const node of data) {
    const result = livestormUserSchema.safeParse(node);

    if (result.success) {
      // Only add users that are not pending invite, we collect this data only for logging purposes
      // It can be filtered in the request by filter[pending_invite], for some reason it is not working, so we filter it here
      if (result.data.attributes.pending_invite) {
        continue;
      }

      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: meta.next_page ? meta.next_page : null,
  };
};

export const deleteUser = async ({ token, userId }: { token: string; userId: string }) => {
  const url = new URL(`${env.LIVESTORM_API_BASE_URL}/users/${userId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: token },
  });

  if (!response.ok && response.status !== 404) {
    throw new LivestormError('Could not delete Livestorm user', { response });
  }
};
