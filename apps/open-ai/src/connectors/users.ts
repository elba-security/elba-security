import { env } from '@/env';
import { OpenAiError } from './commons/error';

export type OpenAiUser = {
  role: string;
  user: { id: string; name: string; email: string };
};

type GetUsersResponseData = { members: { data: OpenAiUser[] } };

export const getUsers = async (token: string, organizationId: string) => {
  const response = await fetch(
    `https://api.openai.com/v1/organizations/${organizationId}/users?limit=${env.USERS_SYNC_BATCH_SIZE}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    throw new OpenAiError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const users = data.members.data.map((user: OpenAiUser) => ({
    id: user.user.id,
    username: user.user.name,
    email: user.user.email,
    role: user.role,
  }));
  return { users };
};
