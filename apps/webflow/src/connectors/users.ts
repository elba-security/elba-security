import { env } from '@/env';
import { WebflowError } from './commons/error';
import { type GetUsersResponseData } from './types';

export type Pagination = {
  next: number | null;
};

export const getUsers = async (token: string, siteId: string, offset: number) => {
  const response = await fetch(
    `https://api.webflow.com/v2/sites/${siteId}/users?limit=${env.USERS_SYNC_BATCH_SIZE}&offset=${offset}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new WebflowError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const users = data.users;
  const pagination: Pagination = {
    next: data.offset + data.limit < data.total ? data.offset + data.limit : null,
  };
  return { users, pagination };
};

export const deleteUser = async (token: string, siteId: string, userId: string) => {
  const response = await fetch(`https://api.webflow.com/v2/sites/${siteId}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new WebflowError(`Could not delete user with Id: ${userId}`, { response });
  }
};
