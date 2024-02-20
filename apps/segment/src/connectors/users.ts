import { env } from '@/env';
import { SegmentError } from './commons/error';

export type SegmentUser = {
  id: string;
  name: string;
  email: string;
};

export type Pagination = {
  current: string;
  next: string | null;
  previous: string | null;
  totalEntries: number;
};

type GetUsersResponseData = { data: { users: SegmentUser[]; pagination: Pagination } };

export const getUsers = async (token: string, page: string | null) => {
  const response = await fetch(
    `https://api.segmentapis.com/users?pagination.count=${env.USERS_SYNC_BATCH_SIZE}&pagination.cursor=${page}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new SegmentError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  return data.data;
};
