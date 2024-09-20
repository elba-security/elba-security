import { z } from 'zod';
import { env } from '@/common/env';
import { FrontError } from '../common/error';

const frontUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  is_admin: z.boolean(),
  is_blocked: z.boolean(),
});

export type FrontUser = z.infer<typeof frontUserSchema>;

const frontResponseSchema = z.object({
  _results: z.array(z.unknown()),
  _pagination: z.object({
    next: z.string().nullable(),
  }),
});

export const getUsers = async (accessToken: string) => {
  const url = new URL(`${env.FRONT_API_BASE_URL}/teammates`);

  // At the moment it doesn't support pagination, however, the response contains a `_pagination` property,
  // The API return all the users including `invited  users but we don't have any flag to filter them out.
  // however, Invited user may not have 'first_name' and 'last_name' fields, therefore we can filter them out based on that. but it's not a reliable way.
  // because sometime admin can update the user's first_name and last_name fields despite of the 'pending' status.
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new FrontError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const result = frontResponseSchema.parse(resData);

  const validUsers: FrontUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of result._results) {
    const userResult = frontUserSchema.safeParse(user);
    if (userResult.success) {
      if (userResult.data.is_blocked) {
        continue;
      }

      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  if (result._pagination.next) {
    throw new FrontError('Front list teammates API started to support pagination', {
      response,
    });
  }

  return {
    validUsers,
    invalidUsers,
  };
};
