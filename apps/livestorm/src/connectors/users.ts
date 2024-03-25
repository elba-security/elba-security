import { env } from '@/env';
import { LivestormError} from './commons/error';


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
  current_page: number;
  previous_page: number | null;
  next_page: number | null;
  record_count: number;
  page_count: number;
  items_per_page: number;
};

type GetUsersResponseData = {users: LivestormUser[]; pagination: Pagination;};

export const getUsers = async (token: string, page: number | null) => {
  const response = await fetch(`https://api.livestorm.co/v1/users?page[size]=${env.USERS_SYNC_BATCH_SIZE}&page[number]=${page}`, {
    headers: { Authorization: token },
  });
  if (!response.ok) {
    throw new LivestormError('Could not retrieve Livestorm users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  return data;
};
export const deleteUser = async (token: string, userId: string) => {

  const url = `https://api.livestorm.co/v1/users/${userId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: token },
  });
  if (!response.ok) {
    throw new LivestormError('Could not delete Livestorm user', { response });
  }
};