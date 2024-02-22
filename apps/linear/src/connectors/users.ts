import { z } from 'zod';
import { env } from '@/env';
import { LinearError } from './commons/error';

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

export type GetUsersParams = {
  token: string;
  afterCursor?: string | null;
};

const perPage = env.USERS_SYNC_BATCH_SIZE;

export const getUsers = async ({ token, afterCursor }: GetUsersParams) => {
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

  const response = await fetch(`${env.LINEAR_API_BASE_URL}graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new LinearError('Could not retrieve users', { response });
  }

  const data: unknown = await response.json();
  const {
    data: {
      users: { nodes, pageInfo },
    },
  } = linearResponseSchema.parse(data);

  const validUsers: LinearUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of nodes) {
    const result = linearUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: pageInfo.endCursor,
  };
};
