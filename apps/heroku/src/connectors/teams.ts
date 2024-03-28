import { HerokuError } from '@/connectors/commons/error';
import { type HerokuTeam } from './types';

export const getTeamId = async (token: string) => {
  const response = await fetch(`https://api.heroku.com/enterprise-accounts`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.heroku+json; version=3' },
  });

  if (!response.ok) {
    throw new HerokuError('Failed to fetch', { response });
  }
  const data = (await response.json()) as HerokuTeam[];
  return data.at(0)?.id;
};
