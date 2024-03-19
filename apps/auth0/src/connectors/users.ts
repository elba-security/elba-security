import { env } from '@/env';
import { Auth0Error } from './commons/error';

export type Auth0User = {
  user_id: string;
  email: string;
  picture: string;
  name: string;
};

export type Pagination = {
  nextRange: string | null;
};

type GetUsersResponseData = { members: Auth0User[]; next: string | undefined };

export const getUsers = async (
  token: string,
  domain: string,
  organizationId: string,
  page?: string
) => {
  const url = new URL(`https://${domain}/api/v2/organizations/${organizationId}/members`);
  url.searchParams.append('take', String(env.USERS_SYNC_BATCH_SIZE));
  if (page) {
    url.searchParams.append('from', page);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Auth0Error('Could not retrieve auth0 users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;

  return data;
};

export const deleteUser = async (
  token: string,
  domain: string,
  organizationId: string,
  userId: string
) => {
  const body = JSON.stringify({
    members: [userId],
  });
  const response = await fetch(`https://${domain}/api/v2/organizations/${organizationId}/members`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    throw new Auth0Error(`Could not delete user with Id: ${userId}`, { response });
  }
};
