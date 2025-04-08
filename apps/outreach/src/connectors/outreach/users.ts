import { z } from 'zod';
import { env } from '@/common/env';
import { OutreachError } from '../common/error';

const outreachUserSchema = z.object({
  id: z.number(),
  attributes: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    locked: z.boolean(),
  }),
});

export type OutreachUser = z.infer<typeof outreachUserSchema>;

const outreachResponseSchema = z.object({
  data: z.array(z.unknown()),
  links: z.object({
    next: z.string().optional(),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  accessToken: string;
  userId: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.OUTREACH_API_BASE_URL}/api/v2/users`);
  url.searchParams.append('page[size]', String(env.OUTREACH_USERS_SYNC_BATCH_SIZE));

  const response = await fetch(page ?? url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new OutreachError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { data, links } = outreachResponseSchema.parse(resData);

  const validUsers: OutreachUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data) {
    const userResult = outreachUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: links.next ?? null,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.OUTREACH_API_BASE_URL}/api/v2/users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      data: {
        type: 'user',
        id: userId,
        attributes: {
          locked: true,
        },
      },
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new OutreachError(`Could not lock user with Id: ${userId}`, { response });
  }
};
