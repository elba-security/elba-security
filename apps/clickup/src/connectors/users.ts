import { ClickUpError } from './commons/error';
import type { GetUsersResponseData } from './types';

export type ClickUpUser = {
  id: number;
  username: string;
  email: string;
  role:number;
};

export const getUsers = async (token: string, teamId:string) => {
  const response = await fetch(`https://api.clickup.com/api/v2/team/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ClickUpError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  return data;
};
