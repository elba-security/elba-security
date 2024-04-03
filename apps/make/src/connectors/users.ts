import { env } from '@/env';
import { MakeError } from './commons/error';

export type MakeUser = {
  id: string;
  name: string;
  email: string;
};
export type Pagination = {
  limit: number;
  offset: number;
};
type GetUsersResponseData = { users: MakeUser[]; pg: Pagination };

export const getUsers = async (token: string, teamId: string, page: number | null) => {
  const url = new URL(
    `https://eu2.make.com/api/v2/users?teamId=${teamId}&pg[limit]=${env.USERS_SYNC_BATCH_SIZE}`
  );

  if (page !== null) {
    url.searchParams.append('pg[offset]', String(page));
  }
  const response = await fetch(url, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!response.ok) {
    throw new MakeError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const users = data.users.map((user: MakeUser) => ({
    id: user.id,
    name: user.name,
    email: user.email,
  }));
  const pagination = {
    next: data.users.length > 0 ? data.pg.offset + data.pg.limit : null,
  };
  return { users, pagination };
};
