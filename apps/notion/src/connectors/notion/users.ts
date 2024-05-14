import { z } from 'zod';
import { env } from '@/common/env';
import { NotionError } from '../common/error';

const notionUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  object: z.string(),
  person: z.object({
    email: z.string(),
  }),
});

export type NotionUser = z.infer<typeof notionUserSchema>;

const notionResponseSchema = z.object({
  results: z.array(z.unknown()),
  next_cursor: z.string().nullable(),
});

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.NOTION_API_BASE_URL}/v1/users`);

  url.searchParams.append('page_size', String(env.NOTION_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('start_cursor', page);
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': env.NOTION_VERSION,
    },
  });

  if (!response.ok) {
    throw new NotionError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { results, next_cursor: nextPage } = notionResponseSchema.parse(resData);

  const validUsers: NotionUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of results) {
    const result = notionUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.NOTION_API_BASE_URL}/users/${userId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new NotionError(`Could not delete user with Id: ${userId}`, { response });
  }
};
