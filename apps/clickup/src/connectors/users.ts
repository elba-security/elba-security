import { env } from '@/env';
import { ClickUpError } from './commons/error';
import type { GetUsersResponseData, UserResponseData } from './types';

export const getUsers = async (token: string, teamId: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ClickUpError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const roles = data.team.roles;

  const users = data.team.members.map((user: UserResponseData) => {
    const userRole = roles.find((role) => role.id === user.user.role);
    return {
      username: user.user.username,
      email: user.user.email,
      id: user.user.id,
      role: userRole?.name,
    };
  });
  return { users };
};
export const deleteUser = async (token: string, teamId: string, userId: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team/${teamId}/user/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ClickUpError(`Could not delete user with Id: ${userId}`, { response });
  }
};
