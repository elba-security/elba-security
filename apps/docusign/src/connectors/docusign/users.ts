import { z } from 'zod';
import { env } from '@/common/env';
import { DocusignError } from '../common/error';

const docusignUserSchema = z.object({
  userId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  userType: z.string(), // 'CompanyUser',
  email: z.string(),
  permissionProfileName: z.string(), // 'Account Administrator' | 'DocuSign Sender' | 'DocuSign Viewer'
});

export type DocusignUser = z.infer<typeof docusignUserSchema>;

const docusignResponseSchema = z.object({
  users: z.array(z.unknown()),
  nextUri: z.string().optional(),
});

export type GetUsersParams = {
  accessToken: string;
  accountId: string;
  apiBaseUri: string;
  page: string | null;
};

export const getUsers = async ({ accessToken, accountId, apiBaseUri, page }: GetUsersParams) => {
  const baseUrl = `${apiBaseUri}/restapi/v2.1/accounts/${accountId}`;

  let url = new URL(`${baseUrl}/users`);

  url.searchParams.append('status', 'Active');
  url.searchParams.append('count', String(env.DOCUSIGN_USERS_SYNC_BATCH_SIZE));

  if (page) {
    url = new URL(`${baseUrl}${page}`); // Example nextUri: '/users?status=Active&start_position=1&count=1'
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();

  const { users, nextUri } = docusignResponseSchema.parse(data);

  const validUsers: DocusignUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of users) {
    const result = docusignUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: nextUri || null,
  };
};

type DeleteUsersParams = {
  apiBaseUri: string;
  accessToken: string;
  accountId: string;
  users: {
    userId: string;
  }[];
};

const getUserSchema = z.object({
  isAdmin: z.string(),
});

export const getUser = async ({
  apiBaseUri,
  accessToken,
  accountId,
  userId,
}: {
  apiBaseUri: string;
  accessToken: string;
  accountId: string;
  userId: string;
}) => {
  const response = await fetch(`${apiBaseUri}/restapi/v2.1/accounts/${accountId}/users/${userId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new DocusignError('Could not retrieve account id', { response });
  }

  const data: unknown = await response.json();

  const result = getUserSchema.safeParse(data);

  if (!result.success) {
    throw new DocusignError('Could not retrieve account id', { response });
  }

  return {
    isAdmin: result.data.isAdmin,
  };
};

export const deleteUsers = async ({
  apiBaseUri,
  accessToken,
  accountId,
  users,
}: DeleteUsersParams) => {
  const url = new URL(`${apiBaseUri}/restapi/v2.1/accounts/${accountId}/users`);

  const response = await fetch(url.toString(), {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      users,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new DocusignError('Could not delete user', { response });
  }
};
