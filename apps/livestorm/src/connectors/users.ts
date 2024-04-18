import { env } from '@/env';
import { LivestormError } from './commons/error';

export type LivestormUser = {
  id: string;
  attributes: {
    role: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

export type Pagination = {
  next_page: number | null;
};

type GetUsersResponseData = { data: LivestormUser[]; meta: Pagination };

export const getUsers = async (token: string, page: number | null) => {
  const response = await fetch(
    `${env.LIVESTORM_API_BASE_URL}/users?page[size]=${env.USERS_SYNC_BATCH_SIZE}&page[number]=${page}`,
    {
      headers: { Authorization: token },
    }
  );
  if (!response.ok) {
    throw new LivestormError('Could not retrieve Livestorm users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  return data;
};
export const deleteUser = async (token: string, userId: string) => {
  const url = `${env.LIVESTORM_API_BASE_URL}/users/${userId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: token },
  });
  if (!response.ok) {
    throw new LivestormError('Could not delete Livestorm user', { response });
  }
};
