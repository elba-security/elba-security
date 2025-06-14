import { z } from 'zod';
import { IntegrationError } from '@elba-security/common';

const discourseUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().optional(),
  active: z.boolean(),
  can_be_deleted: z.boolean(),
});

export type DiscourseUser = z.infer<typeof discourseUserSchema>;

const discourseResponseSchema = z.array(z.unknown());

export type GetUsersParams = {
  apiKey: string;
  defaultHost: string;
  apiUsername: string;
  page?: number | null;
};

export type DeleteUsersParams = {
  apiKey: string;
  userId: string;
  defaultHost: string;
  apiUsername: string;
};

export const getUsers = async ({ apiKey, defaultHost, apiUsername, page }: GetUsersParams) => {
  const url = new URL(`https://${defaultHost}.discourse.group/admin/users/list/active.json`);

  if (page) {
    url.searchParams.append('page', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
      'Api-Username': apiUsername,
    },
  });

  if (!response.ok) {
    throw new IntegrationError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const users= discourseResponseSchema.parse(resData);
  const validUsers: DiscourseUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = discourseUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? String((page ?? 1) + 1) : null, // page should be 1, not 0 because the API returns the same result
  };
};

export const deleteUser = async ({
  userId,
  defaultHost,
  apiUsername,
  apiKey,
}: DeleteUsersParams) => {
  const url = new URL(
    `https://${defaultHost}.discourse.group/admin/users/${userId}/deactivate.json`
  );

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': apiKey,
      'Api-Username': apiUsername,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new IntegrationError(`Could not delete user with Id: ${userId}`, { response });
  }
};
