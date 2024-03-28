import { env } from '@/env';
import { HarvestError } from './commons/error';
import { type GetUsersResponseData } from './types';

export type Pagination = {
  nextRange: string | null;
};

export const getUsers = async (token: string, harvestId: number, page: number | null) => {
  const url = new URL('https://api.harvestapp.com/v2/users');
  url.searchParams.append('per_page', String(env.USERS_SYNC_BATCH_SIZE));
  if (page) {
    url.searchParams.append('page', String(page));
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Harvest-Account-Id': String(harvestId),
  };
  const response = await fetch(url, {
    headers,
  });
  if (!response.ok) {
    throw new HarvestError('Could not retrieve harvest users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  return data;
};

export const deleteUser = async (token: string, harvestId: number, userId: number) => {
  const response = await fetch(`https://api.harvestapp.com/v2/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Harvest-Account-Id': String(harvestId),
    },
  });

  if (!response.ok) {
    throw new HarvestError(`Could not delete user with Id: ${userId}`, { response });
  }
};
