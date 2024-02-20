/**
 * DISCLAIMER:
 * This is an example connector, the function has a poor implementation. When requesting against API endpoint we might prefer
 * to valid the response data received using zod than unsafely assign types to it.
 * This might not fit your usecase if you are using a SDK to connect to the Saas.
 * These file illustrate potential scenarios and methodologies relevant for SaaS integration.
 */

import { env } from '@/env';
import { GitlabError } from './commons/error';
import { getNextPageFromLink } from './commons/pagination';

export type GitlabUser = {
  id: string;
  username: string;
  name: string;
  email: string | undefined;
};

type GitlabResponse = GitlabUser[];

export type GitlabPaginatedResponse<T> = {
  'next'?: string;
  data: T[];
};

export type GetUsersParams = {
  token: string;
  page: string | null;
};
export const getUsers = async ({ token, page }: GetUsersParams) => {

  const url = new URL(`${env.GITLAB_API_BASE_URL}api/v4/users`);
  url.searchParams.append('pagination', 'keyset');
  url.searchParams.append('per_page', env.USERS_SYNC_BATCH_SIZE);
  url.searchParams.append('order_by', 'id');
  url.searchParams.append('sort', 'asc');
  url.searchParams.append('active', 'true');
  url.searchParams.append('without_project_bots', 'true')
  
  if (page) {
    url.searchParams.append('id_after', page);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new GitlabError('Could not retrieve users', { response });
  }

  const data = (await response.json()) as GitlabResponse;

  const linkHeader = response.headers.get('Link');
  const paging = getNextPageFromLink(linkHeader);

  return {data, paging};
};
