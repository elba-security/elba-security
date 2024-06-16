import { MakeError } from '@/connectors/commons/error';
import type { GetEntityResponseData } from '../types';

export const getTeamIds = async (token: string, organizationId: string, zoneDomain: string) => {
  const response = await fetch(`https://${zoneDomain}/api/v2/teams?organizationId=${organizationId}`, {
    headers: { Authorization: `Token ${token}` },
  });

  if (!response.ok) {
    throw new MakeError('Failed to fetch', { response });
  }

  const data = (await response.json()) as GetEntityResponseData;

  const teamIds: string[] = data.entities.map((team) => team.id);
  return teamIds;
};