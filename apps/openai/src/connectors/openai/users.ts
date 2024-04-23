import { OpenAiError } from './common/error';

export type OpenAiUser = {
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type GetUsersResponseData = { members: { data: OpenAiUser[] } };

type GetUsersParams = {
  apiKey: string;
  organizationId: string;
};

export const getUsers = async ({ apiKey, organizationId }: GetUsersParams) => {
  const response = await fetch(`https://api.openai.com/v1/organizations/${organizationId}/users`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    throw new OpenAiError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const users = data.members.data;
  return { users };
};

type DeleteUserParams = {
  apiKey: string;
  organizationId: string;
  userId: string;
};

export const deleteUser = async ({ apiKey, organizationId, userId }: DeleteUserParams) => {
  const response = await fetch(
    `https://api.openai.com/v1/organizations/${organizationId}/users/${userId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    }
  );
  if (!response.ok && response.status !== 404) {
    throw new OpenAiError(`Could not delete user with Id: ${userId}`, { response });
  }
};
