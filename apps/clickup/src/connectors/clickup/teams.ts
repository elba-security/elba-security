import { z } from 'zod';
import { ClickUpError } from '@/connectors/common/error';
import { env } from '@/common/env';

export const teamSchema = z.object({
  id: z.string(),
});

const getTeamsSchema = z.object({
  teams: z.array(teamSchema).nonempty(),
});

export const getTeamIds = async (token: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new ClickUpError('Failed to fetch teams', { response });
  }

  const resData: unknown = await response.json();

  const result = getTeamsSchema.safeParse(resData);

  if (!result.success) {
    throw new ClickUpError('Invalid team data structure', { response });
  }

  return result.data.teams;
};
