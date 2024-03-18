import { env } from '@/env';
import { VercelError } from './commons/error';


export type VercelUser = {
  role: string;
  uid: string;
  name?: string;
  email: string;
};

export type Pagination = {
  count: number;
  next: string | null;
  prev: string | null;
  hasNext: boolean;
};

type GetTeamMembersResponseData = { members: VercelUser[]; pagination: Pagination };

export const getUsers = async (token: string, teamId: string, page:string|null) => {
  const url = new URL('https://api.vercel.com/v2/teams/${teamId}/members')
  url.searchParams.append('limit', String(env.USERS_SYNC_BATCH_SIZE))
  if (page) {
    url.searchParams.append('until', page)
  }

  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new VercelError('Could not retrieve team members', { response });
  }

  const data = (await response.json()) as GetTeamMembersResponseData;
  return data;
};
export const deleteUser = async (token: string, teamId: string, userId: string) => {
  const response = await fetch(
    `https://api.vercel.com/v2/teams/${teamId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new VercelError(`Could not delete team member with Id: ${userId}`, { response });
  }
};