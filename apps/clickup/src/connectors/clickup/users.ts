import {z} from 'zod'
import { env } from '@/common/env';
import { ClickUpError } from '../commons/error';

const UserResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    username: z.string(),
    role: z.number(),
  }),
});

const GetUsersResponseSchema = z.object({
  team: z.object({
    members: z.array(UserResponseSchema),
    roles: z.array(z.object({
      id: z.number(),
      name: z.string(),
    })),
  }),
});

export const ClickupUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string(),
  role: z.string(),
})

export const getUsers = async (token: string, teamId: string) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new ClickUpError('Could not retrieve users', { response });
  }
  const resData: unknown = await response.json();
  const result = GetUsersResponseSchema.parse(resData);
  const roles = result.team.roles;

  const users = result.team.members.map((user) => {
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
