import { z } from 'zod';
import { env } from '@/common/env';
import { JumpcloudError } from '../common/error';

const jumpcloudUserSchema = z.object({
  _id: z.string(),
  suspended: z.boolean(),
  email: z.string().email(),
  alternateEmail: z.string().email().nullish(),
  firstname: z.string(),
  lastname: z.string(),
  username: z.string().nullish(),
  enableMultiFactor: z.boolean().nullish(),
  mfaEnrollment: z
    .object({
      overallStatus: z.string(),
    })
    .nullish(),
});

export type JumpcloudUser = z.infer<typeof jumpcloudUserSchema>;

const jumpcloudResponseSchema = z.object({
  results: z.array(z.unknown()),
  totalCount: z.number(),
});

export type GetUsersParams = {
  apiKey: string;
  after: number;
  role: 'admin' | 'member';
};

export type DeleteUserByRoleParams = {
  userId: string;
  apiKey: string;
  role: 'admin' | 'member';
};

const perPage = env.JUMPCLOUD_USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ apiKey, after, role }: GetUsersParams) => {
  const url = new URL(
    `${env.JUMPCLOUD_API_BASE_URL}${role === 'member' ? 'systemusers' : 'users'}`
  );

  url.searchParams.append('limit', String(perPage));
  url.searchParams.append('skip', String(after));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new JumpcloudError('API request failed', { response });
  }

  const resData: unknown = await response.json();
  const { results, totalCount } = jumpcloudResponseSchema.parse(resData);

  const validUsers: JumpcloudUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of results) {
    const result = jumpcloudUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: totalCount > after + perPage ? after + perPage : null,
  };
};

const deleteUserByRole = async ({ userId, apiKey, role }: DeleteUserByRoleParams) => {
  const url = new URL(
    `${env.JUMPCLOUD_API_BASE_URL}${role === 'member' ? 'systemusers' : 'users'}/${userId}`
  );

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      suspended: true,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new JumpcloudError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export type DeleteUserParams = {
  userId: string;
  apiKey: string;
};

export const deleteUser = async (params: DeleteUserParams) => {
  const [adminResult, memberResult] = await Promise.allSettled([
    deleteUserByRole({ ...params, role: 'admin' }),
    deleteUserByRole({ ...params, role: 'member' }),
  ]);

  // if one of the two requests succeed we don't throw any error
  if (adminResult.status !== memberResult.status) {
    return;
  }

  // otherwise we throw one of the failing request
  if (adminResult.status === 'rejected') {
    throw adminResult.reason;
  }

  if (memberResult.status === 'rejected') {
    throw memberResult.reason;
  }
};
