import { HerokuError } from './commons/error';
import { type HerokuUser } from './types';

export type Pagination = {
  nextRange: string | null;
};

export const getUsers = async (token: string, teamId: string, range: string | null) => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.heroku+json; version=3',
  };

  if (range) {
    headers.Range = range;
  }
  const response = await fetch(`https://api.heroku.com/enterprise-accounts/${teamId}/members`, {
    headers,
  });
  if (!response.ok) {
    throw new HerokuError('Could not retrieve heroku users', { response });
  }
  const data = (await response.json()) as HerokuUser[];

  if (response.status === 206) {
    const pagination: Pagination = {
      nextRange: response.headers.get('Next-Range'),
    };
    return { users: data, pagination };
  }

  const pagination: Pagination = {
    nextRange: null,
  };

  return { users: data, pagination };
};

export const deleteUser = async (token: string, teamId: string, userId: string) => {
  const response = await fetch(
    `https://api.heroku.com/enterprise-accounts/${teamId}/members/${userId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.heroku+json; version=3',
      },
    }
  );

  if (!response.ok) {
    throw new HerokuError(`Could not delete user with Id: ${userId}`, { response });
  }
};
