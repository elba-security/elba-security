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

export type ClickUpUser = z.infer<typeof ClickupUserSchema>;

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

  const validUsers: ClickUpUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const member of result.team.members) {
    const userRole = roles.find((role) => role.id === member.user.role);
    const userData = {
      username: member.user.username,
      email: member.user.email,
      id: member.user.id,
      role: userRole?.name,
    };

    const result = ClickupUserSchema.safeParse(userData);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(member);
    }
  }

  return { validUsers, invalidUsers };
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
