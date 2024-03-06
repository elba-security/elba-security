import { OpenAiError } from './commons/error';

export type OpenAiUser = {
  role: string;
  user: { id: string; name: string; email: string };
};

type GetUsersResponseData = { members: { data: OpenAiUser[] } };

export const getUsers = async (token: string, organizationId: string) => {
  const response = await fetch(`https://api.openai.com/v1/organizations/${organizationId}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new OpenAiError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const users = data.members.data;
  return { users };
};

export const deleteUser = async (token: string, organizationId: string, userId: string) => {
  const response = await fetch(
    `https://api.openai.com/v1/organizations/${organizationId}/users/${userId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new OpenAiError(`Could not delete user with Id: ${userId}`, { response });
  }
};
