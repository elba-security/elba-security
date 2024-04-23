import { z } from 'zod';
import { env } from '@/env';
import { GitlabError } from './commons/error';
import { getNextPageFromLink } from './commons/pagination';

const gitlabUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
});

export type GitlabUser = z.infer<typeof gitlabUserSchema>;

const gitlabResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  accessToken: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL(`${env.GITLAB_API_BASE_URL}api/v4/users`);
  url.searchParams.append('pagination', 'keyset');
  url.searchParams.append('per_page', String(env.USERS_SYNC_BATCH_SIZE));
  url.searchParams.append('order_by', 'id');
  url.searchParams.append('sort', 'asc');
  url.searchParams.append('active', 'true');
  url.searchParams.append('without_project_bots', 'true');

  if (page) {
    url.searchParams.append('id_after', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new GitlabError('Could not retrieve users', { response });
  }
  const resData: unknown = await response.json();

  const linkHeader = response.headers.get('Link');
  const nextPage = getNextPageFromLink(linkHeader);

  const data = gitlabResponseSchema.parse(resData);

  const validUsers: GitlabUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data) {
    const result = gitlabUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = `${env.GITLAB_API_BASE_URL}api/v4/users/${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new GitlabError(`Could not delete user with Id: ${userId}`, { response });
  }
};
