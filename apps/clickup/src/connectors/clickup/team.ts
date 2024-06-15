import { ClickUpError } from '@/connectors/commons/error';
import { env } from '@/common/env';
import type { GetTeamResponseData } from '../types';

export const getTeamIds = async (token: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new ClickUpError('Failed to fetch', { response });
  }

  const data = (await response.json()) as GetTeamResponseData;

  const teamIds: string[] = data.teams.map((team) => team.id);
  return teamIds;
};
