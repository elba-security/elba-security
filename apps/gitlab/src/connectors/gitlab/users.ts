import { env } from '@/common/env';
import { GitlabError } from './commons/error';
import { getNextPageFromLink } from './commons/pagination';

export type GitlabUser = {
  id: number;
  username: string;
  name: string | undefined;
  email: string | undefined;
};

type GitlabResponse = GitlabUser[];

export type GetUsersParams = {
  accessToken: string;
  page: string | null;
};

export const getUsers = async ({ accessToken, page }: GetUsersParams) => {
  const url = new URL('https://gitlab.com/api/v4/users');
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

  const users = (await response.json()) as GitlabResponse;

  const linkHeader = response.headers.get('Link');
  const nextPage = getNextPageFromLink(linkHeader);

  return { users, nextPage };
};
