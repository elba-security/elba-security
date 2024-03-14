import { env } from '@/env';
import { VercelError } from './commons/error';


export type VercelUser = {
  role: string;
  uid: string;
  name: string;
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
  const url = `https://api.vercel.com/v2/teams/${teamId}/members${page !== null ? `?limit=${env.USERS_SYNC_BATCH_SIZE}&until=${page}` : `?limit=${env.USERS_SYNC_BATCH_SIZE}`}`;

  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new VercelError('Could not retrieve team members', { response });
  }

  const data = (await response.json()) as GetTeamMembersResponseData;
  return data;
};
