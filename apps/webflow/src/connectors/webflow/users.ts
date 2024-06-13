import { env } from '@/common/env';
import { WebflowError } from '../commons/error';
import { type GetUsersResponseData } from '../types';

export type Pagination = {
  next: number | null;
};

export const getUsers = async (token: string, siteId: string, offset: number) => {
  const url = new URL(`${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users`);

  url.searchParams.set('limit', env.USERS_SYNC_BATCH_SIZE.toString());
  url.searchParams.set('offset', offset.toString());

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

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
  const url = new URL(`${env.WEBFLOW_API_BASE_URL}/v2/sites/${siteId}/users/${userId}`);
  const response = await fetch(url.toString(), {
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
