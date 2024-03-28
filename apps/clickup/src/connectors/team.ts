import { ClickUpError } from '@/connectors/commons/error';
import type { GetTeamResponseData } from './types';

export const getTeamId = async (token: string) => {
  const response = await fetch(`https://api.clickup.com/api/v2/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new ClickUpError('Failed to fetch', { response });
  }

  const data = (await response.json()) as GetTeamResponseData;

  return data.teams.at(0)?.id;
};
