import { HerokuError } from './commons/error';

export type Pagination = {
  nextRange: string | null;
};

export type HerokuUser = {
  user: {
    email: string;
    id: string;
  };
  two_factor_authentication: boolean;
  role: string;
};

export const getUsers = async (token: string, teamId: string, cursor: string | null) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.heroku+json; version=3',
  };

  if (cursor) {
    headers.Range = cursor;
  }
  const response = await fetch(`https://api.heroku.com/teams/${teamId}/members`, {
    headers,
  });
  if (!response.ok) {
    throw new HerokuError('Could not retrieve heroku users', { response });
  }
  const data = (await response.json()) as HerokuUser[];

  return { users: data, nextCursor: response.headers.get('Next-Range') };
};

export const deleteUser = async (token: string, teamId: string, userId: string) => {
  const response = await fetch(`https://api.heroku.com/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.heroku+json; version=3',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new HerokuError(`Could not delete user with id=${userId} & teamId=${teamId}`, {
      response,
    });
  }
};
