import { HerokuError } from '@/connectors/commons/error';

export type HerokuTeam = {
  id: string;
};

export const getTeams = async (token: string, cursor: string | null) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.heroku+json; version=3',
  };

  if (cursor) {
    headers.Range = cursor;
  }

  const response = await fetch(`https://api.heroku.com/teams?max=10`, {
    headers,
  });

  if (!response.ok) {
    throw new HerokuError('Failed to retrieve teams', { response });
  }

  const data = (await response.json()) as HerokuTeam[];

  const nextRange = response.headers.get('Next-Range') ?? null;
  return { teams: data, nextCursor: nextRange };
};
