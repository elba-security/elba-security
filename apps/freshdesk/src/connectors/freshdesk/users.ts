import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { FreshdeskError } from '../common/error';

const freshdeskUserSchema = z.object({
  id: z.number(),
  contact: z.object({
    active: z.boolean(),
    email: z.string(),
    name: z.string(),
  }),
});

export type FreshdeskUser = z.infer<typeof freshdeskUserSchema>;

const freshdeskResponseSchema = z.array(z.unknown());

const getAuthUserResponseData = z.object({
  contact_person: z.object({ email: z.string() }),
});

export type GetUsersParams = {
  userName: string;
  password: string;
  subDomain: string;
  page: number | null;
};

export type GetAuthUserParams = {
  userName: string;
  password: string;
  subDomain: string;
};

export type DeleteUsersParams = {
  userName: string;
  password: string;
  subDomain: string;
  userId: string;
};

export const getUsers = async ({ userName, password, subDomain, page }: GetUsersParams) => {
  const encodedToken = btoa(`${userName}:${password}`);
  const url = new URL(`https://${subDomain}.freshdesk.com/api/v2/agents`);

  url.searchParams.append('per_page', String(env.FRESHDESK_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url.searchParams.append('page', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedToken}`,
    },
  });

  if (!response.ok) {
    throw new FreshdeskError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const users = freshdeskResponseSchema.parse(resData);

  const validUsers: FreshdeskUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const userResult = freshdeskUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: users.length > 0 ? (page ?? 1) + 1 : null, // page should be positive integer
  };
};

// Owner of the organization cannot be deleted
export const deleteUser = async ({ userId, userName, password, subDomain }: DeleteUsersParams) => {
  const encodedToken = btoa(`${userName}:${password}`);

  const url = new URL(`https://${subDomain}.freshdesk.com/api/v2/agents/${userId}`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${encodedToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new FreshdeskError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const getAuthUser = async ({ userName, password, subDomain }: GetAuthUserParams) => {
  const encodedToken = btoa(`${userName}:${password}`);

  const response = await fetch(`https://${subDomain}.freshdesk.com/api/v2/account`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${encodedToken}`,
    },
  });

  if (!response.ok) {
    throw new FreshdeskError('Failed to retrieve authenticated user information', { response });
  }

  const data: unknown = await response.json();
  const result = getAuthUserResponseData.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Freshdesk auth user  response', { data });
    throw new Error('Invalid Freshdesk auth user  response', {
      cause: result.error,
    });
  }

  return {
    authUserEmail: result.data.contact_person.email,
  };
};
