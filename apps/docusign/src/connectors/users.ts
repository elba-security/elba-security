import { z } from 'zod';
import { env } from '@/env';
import { DocusignError } from './commons/error';

const docusignUserSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  firstName: z.string(),
  middleName: z.string(),
  lastName: z.string(),
  userStatus: z.string(),
  isAdmin: z.string(),
  email: z.string(),
});

export type DocusignUser = z.infer<typeof docusignUserSchema>;

const docusignResponseSchema = z.object({
  users: z.array(z.unknown()),
  totalSetSize: z.string().nullable(),
  endPosition: z.string().nullable(),
});

export type GetUsersParams = {
  token: string;
  accountID: string;
  apiBaseURI: string;
  start?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  token: string;
  apiBaseURI: string;
};

const count = env.USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ token, accountID, apiBaseURI, start }: GetUsersParams) => {
  const url = new URL(`${apiBaseURI}/restapi/v2.1/accounts/${accountID}/users`);
  url.searchParams.append('count', String(count));
  if (start) {
    url.searchParams.append('startPosition', String(start));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const { users, totalSetSize, endPosition } = docusignResponseSchema.parse(data);

  const validUsers: DocusignUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of users) {
    const result = docusignUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  if (!endPosition || !totalSetSize) {
    throw new DocusignError('Could not retrieve pagination info', { response });
  }

  // check if there is a next page
  const startPosition = parseInt(endPosition, 10) + 1;
  const moreResults = startPosition < parseInt(totalSetSize, 10);

  return {
    validUsers,
    invalidUsers,
    nextPage: moreResults ? startPosition : '',
  };
};

export const deleteUsers = async ({ userId, apiBaseURI, token }: DeleteUsersParams) => {
  const url = new URL(`${apiBaseURI}/restapi/v2.1/accounts/${userId}/users`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      usersInfoList: {
        users: [userId],
      },
    }),
  });

  if (!response.ok) {
    throw new DocusignError('Could not delete user', { response });
  }

  return {
    success: true,
  };
};

