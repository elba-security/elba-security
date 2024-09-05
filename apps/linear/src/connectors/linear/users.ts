import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { LinearError } from '../common/error';

const linearUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  name: z.string(),
  active: z.boolean(),
  email: z.string().optional(),
});

export type LinearUser = z.infer<typeof linearUserSchema>;

const linearResponseSchema = z.object({
  data: z.object({
    users: z.object({
      nodes: z.array(z.unknown()),
      pageInfo: z.object({
        hasNextPage: z.boolean(),
        endCursor: z.string().nullable(),
      }),
    }),
  }),
});

const authUserIdResponseSchema = z.object({
  data: z.object({
    viewer: z.object({
      id: z.string(),
    }),
    organization: z.object({
      urlKey: z.string(),
    }),
  }),
});
export type GetUsersParams = {
  accessToken: string;
  afterCursor?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
};
const perPage = env.LINEAR_USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ accessToken, afterCursor }: GetUsersParams) => {
  const query = {
    query: `
      query($afterCursor: String, $perPage: Int) {
        users(first: $perPage, after: $afterCursor) {
          nodes {
            id
            username: name
            name: displayName
            active
            email
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables: {
      afterCursor: afterCursor ? afterCursor : null,
      perPage,
    },
  };

  const response = await fetch(`${env.LINEAR_API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new LinearError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();

  const { data } = linearResponseSchema.parse(resData);

  const validUsers: LinearUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of data.users.nodes) {
    const result = linearUserSchema.safeParse(user);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: data.users.pageInfo.hasNextPage ? data.users.pageInfo.endCursor : null,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const query = {
    query: `
      mutation UserSuspend($userSuspendId: String!) { userSuspend(id: $userSuspendId) { success } }
    `,
    variables: {
      userSuspendId: String(userId),
    },
  };

  const response = await fetch(`${env.LINEAR_API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new LinearError(`Could not suspend user with Id: ${userId}`, { response });
  }
};

export const getAuthUser = async (accessToken) => {
  const query = {
    query: `
      query { viewer { id } organization { urlKey } }
    `,
  };

  const response = await fetch(`${env.LINEAR_API_BASE_URL}/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new LinearError('Could not retrieve auth-user id and workspace url', { response });
  }

  const resData: unknown = await response.json();

  const result = authUserIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Linear auth-user id response', { resData });
    throw new LinearError('Invalid Linear auth-user id response');
  }

  return {
    authUserId: result.data.data.viewer.id,
    workspaceUrlKey: result.data.data.organization.urlKey,
  };
};
