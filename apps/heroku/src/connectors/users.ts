import { HerokuError } from './commons/error';

export type HerokuUser = {
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export type HerokuPagination = {
  nextRange: string | null;
};

// type GetHerokuUsersResponseData = {HerokuUser[] };

export const getHerokuUsers = async (
  token: string,
  teamId: string,
  range?: string // Optional parameter to handle Range header
): Promise<{ users: HerokuUser[]; pagination: HerokuPagination }> => {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.heroku+json; version=3',
  };

  // Add Range header if provided
  if (range) {
    headers.Range = range;
  }

  const response = await fetch(
    `https://api.heroku.com/teams/${teamId}/members`,
    {
      headers,
    }
  );

  if (!response.ok) {
    throw new HerokuError('Could not retrieve Heroku users', { response });
  }

  const responseData = (await response.json());

  // Extract the Next-Range header from the response
  const nextRangeHeader = response.headers.get('Next-Range');
  
  // Check if the status code is 206 Partial Content
  const pagination: HerokuPagination = {
    nextRange: response.status === 206 ? nextRangeHeader : null,
  };



  return { users: responseData, pagination };
};
export const deleteTeamMember = async (token: string, teamId: string, memberId: string) => {
  const uri = `https://api.heroku.com/teams/${teamId}/members/${memberId}`;
  
  const response = await fetch(uri, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/vnd.heroku+json; version=3',
    },
  });

  if (!response.ok) {
    throw new HerokuError(`Could not delete team member: ${memberId}`, { response });
  }
};