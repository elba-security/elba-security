import { z } from 'zod';
import { env } from '@/common/env';
import { OktaError } from '@/connectors/common/error';
import { getNextPageUrlFromLink } from '../common/pagination';

const getUsersResponseSchema = z.array(z.unknown());

export const oktaUserSchema = z.object({
  id: z.string().min(1),
  profile: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
  }),
});

export type GetUsersParams = {
  token: string;
  subDomain: string;
  page?: string | null;
};

export type GetAuthUserParams = {
  token: string;
  subDomain: string;
};

export type DeleteUsersParams = {
  token: string;
  userId: string;
  subDomain: string;
};

export type OktaUser = z.infer<typeof oktaUserSchema>;

export const getUsers = async ({ token, subDomain, page }: GetUsersParams) => {
  const url = new URL(`https://${subDomain}.okta.com/api/v1/users`);

  url.searchParams.append('filter', 'status eq "ACTIVE"');
  url.searchParams.append('limit', `${env.OKTA_USERS_SYNC_BATCH_SIZE}`);

  const response = await fetch(page ?? url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new OktaError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const resultData = getUsersResponseSchema.parse(resData);

  const validUsers: OktaUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of resultData) {
    const userResult = oktaUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: getNextPageUrlFromLink(response.headers),
  };
};

const getAuthUserSchema = z.object({
  id: z.string(),
});

export const getAuthUser = async ({ token, subDomain }: GetAuthUserParams) => {
  const response = await fetch(`https://${subDomain}.okta.com/api/v1/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new OktaError('Failed to fetch auth user', { response });
  }

  const resData: unknown = await response.json();

  const result = getAuthUserSchema.safeParse(resData);

  if (!result.success) {
    throw new OktaError('Invalid auth user data structure', { response });
  }

  return result.data.id;
};

export const deleteUser = async ({ userId, token, subDomain }: DeleteUsersParams) => {
  const response = await fetch(`https://${subDomain}.okta.com/api/v1/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new OktaError(`Could not delete user with Id: ${userId}`, { response });
  }
};
