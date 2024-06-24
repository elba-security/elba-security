import { ClickUpError } from '@/connectors/commons/error';
import { env } from '@/common/env';
import { z } from 'zod';

export const ClickUpTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const GetTeamResponseSchema = z.object({
  teams: z.array(ClickUpTeamSchema),
});


export const getTeamIds = async (token: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new ClickUpError('Failed to fetch', { response });
  }

  const resData: unknown = await response.json();
  const result = GetTeamResponseSchema.parse(resData);

  const teamIds: string[] = result.teams.map((team) => team.id);
  return teamIds;
};
