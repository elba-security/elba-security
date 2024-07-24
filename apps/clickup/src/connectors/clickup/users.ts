import { z } from 'zod';
import { env } from '@/common/env';
import { ClickUpError } from '../common/error';

const userResponseSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  username: z.string().nullable(),
  role: z.number(),
  date_joined: z.string().nullable(),
});

const getUsersResponseSchema = z.object({
  team: z.object({
    members: z.array(
      z.object({
        user: userResponseSchema,
      })
    ),
    roles: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
      })
    ),
  }),
});

export const clickupUserSchema = z.object({
  id: z.number().min(1),
  email: z.string().email(),
  username: z.string().nullable(),
  role: z.string(),
});

export type ClickUpUser = z.infer<typeof clickupUserSchema>;

// Listing the users of workspace is undocumented api & still it  doesn't have pagination
export const getUsers = async ({ token, teamId }: { token: string; teamId: string }) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team/${teamId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new ClickUpError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const resultData = getUsersResponseSchema.parse(resData);
  const roles = resultData.team.roles;

  const validUsers: ClickUpUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const { user } of resultData.team.members) {
    // if `date_joined` is null, it means the user is invited but not joined yet
    if (!user.date_joined) {
      continue;
    }

    const userRole = roles.find((role) => role.id === user.role);
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: userRole?.name,
    };

    const result = clickupUserSchema.safeParse(userData);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return { validUsers, invalidUsers };
};

export const deleteUser = async ({
  token,
  teamId,
  userId,
}: {
  token: string;
  teamId: string;
  userId: string;
}) => {
  const response = await fetch(`${env.CLICKUP_API_BASE_URL}/team/${teamId}/user/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new ClickUpError(`Could not delete user with Id: ${userId}`, { response });
  }
};
