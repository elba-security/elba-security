import { z } from 'zod';
import { IntegrationError } from '@elba-security/common';
import { env } from '@/common/env';

const apaleoUserSchema = z.object({
  subjectId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
});

export type ApaleoUser = z.infer<typeof apaleoUserSchema>;

const apaleoResponseSchema = z.object({
  users: z.array(z.unknown()),
});

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
};

export const getUsers = async (accessToken: string) => {
  const url = new URL(`${env.APALEO_API_BASE_URL}/api/v1/users`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { users } = apaleoResponseSchema.parse(resData);

  const validUsers: ApaleoUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = apaleoUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
  };
};

export const deactivateUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.APALEO_API_BASE_URL}/api/v1/users/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ enabled: false }),
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError(`Could not deactivate user with Id: ${userId}`, { response });
  }
};
