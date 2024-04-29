import { z } from 'zod';
import { env } from '@/common/env';
import { LivestormError } from './commons/error';

const livestormUserSchema = z.object({
  id: z.string(),
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
  const baseUrl = `${env.LIVESTORM_API_BASE_URL}/users`;
  let queryString = `?page[size]=${env.LIVESTORM_USERS_SYNC_BATCH_SIZE}`;

  if (page) {
    queryString += `&page[number]=${page}`;
  }

  const endpointUrl = new URL(baseUrl + queryString);

  const response = await fetch(endpointUrl, {
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new LivestormError('Could not retrieve Livestorm users', { response });
  }

  const resData: unknown = await response.json();
  const validUsers: LivestormUser[] = [];
  const invalidUsers: unknown[] = [];
  const invitedUsers: LivestormUser[] = [];

  const { data, meta } = livestormResponseSchema.parse(resData);

  for (const node of data) {
    const result = livestormUserSchema.safeParse(node);

    if (result.success) {
      // Only add users that are not pending invite, we collect this data only for logging purposes
      if (result.data.attributes.pending_invite) {
        invitedUsers.push(result.data);
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
    invitedUsers,
    nextPage: meta.next_page ? meta.next_page : null,
  };
};

export const deleteUser = async (token: string, userId: string) => {
  const url = new URL(`${env.LIVESTORM_API_BASE_URL}/users/${userId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: token },
  });

  if (!response.ok) {
    throw new LivestormError('Could not delete Livestorm user', { response });
  }
};
