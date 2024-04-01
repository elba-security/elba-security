import { ClickUpError } from './commons/error';
import type { GetUsersResponseData, ClickUpUser } from './types';

export const getUsers = async (token: string, teamId: string) => {
  const response = await fetch(`https://api.clickup.com/api/v2/team/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ClickUpError('Could not retrieve users', { response });
  }
  const data = (await response.json()) as GetUsersResponseData;
  const roles = data.team.roles;

  const users = data.team.members.map((user: ClickUpUser) => {
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
  const response = await fetch(`https://api.clickup.com/api/v2/team/${teamId}/user/${userId}`, {
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
