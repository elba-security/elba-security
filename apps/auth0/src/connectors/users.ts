import { env } from '@/env';
import { Auth0Error } from './commons/error';

export type Auth0User = {
  user_id: string;
  email: string;
  name: string;
};

export type Pagination = {
  nextPage: number | null;
};

export const getUsers = async (token: string, domain: string, page: number | null) => {
  const url = new URL(`https://${domain}/api/v2/users`);
  url.searchParams.append('per_page', String(env.USERS_SYNC_BATCH_SIZE));
  if (page) {
    url.searchParams.append('page', String(page));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Auth0Error('Could not retrieve auth0 users', { response });
  }
  const data = (await response.json()) as Auth0User[];
  const pagination: Pagination = {
    nextPage:
      data.length < env.USERS_SYNC_BATCH_SIZE ? null : env.USERS_SYNC_BATCH_SIZE + (page || 0),
  };
  return { users: data, pagination };
};

export const deleteUser = async (token: string, domain: string, userId: string) => {
  const response = await fetch(`https://${domain}/api/v2/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Auth0Error(`Could not delete user with Id: ${userId}`, { response });
  }
};
