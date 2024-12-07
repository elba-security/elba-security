import { z } from 'zod';
import { ElasticError } from './common/error';

const elasticUserSchema = z.object({
  user_id: z.string(),
  name: z.string().optional(),
  email: z.string(),
  role_assignments: z
    .object({
      organization: z
        .array(
          z.object({
            role_id: z.string(),
          })
        )
        .nullish(),
      deployment: z
        .array(
          z.object({
            role_id: z.string(),
          })
        )
        .nullish(),
    })
    .nullish(),
});

export type ElasticUser = z.infer<typeof elasticUserSchema>;

const elasticResponseSchema = z.object({
  members: z.array(z.unknown()),
  from: z.number().optional(),
});

export type GetUsersParams = {
  apiKey: string;
  accountId: string;
  afterToken?: string | null;
};

export const getUsers = async ({ apiKey, accountId, afterToken }: GetUsersParams) => {
  const endpoint = new URL(
    `https://api.elastic-cloud.com/api/v1/organizations/${accountId}/members`
  );

  if (afterToken) {
    endpoint.searchParams.append('from', String(afterToken));
  }

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ElasticError('API request failed', { response });
  }

  const data: unknown = await response.json();

  const { members, from } = elasticResponseSchema.parse(data);

  const validUsers: ElasticUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of members) {
    const result = elasticUserSchema.safeParse(node);
    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: from ? (from + 1).toString() : null,
  };
};

export type DeleteUsersParams = {
  userId: string;
  accountId: string;
  apiKey: string;
};

export const deleteUser = async ({ userId, accountId, apiKey }: DeleteUsersParams) => {
  const url = `https://api.elastic-cloud.com/api/v1/organizations/${accountId}/members/${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
  });
  const elasticErrorDataSchema = z.object({
    errors: z.array(
      z.object({
        code: z.string().nullish(),
        message: z.string().nullish(),
      })
    ),
  });

  if (response.status === 400) {
    const errorDataResult = elasticErrorDataSchema.safeParse(await response.json());
    if (
      errorDataResult.success &&
      errorDataResult.data.errors.at(0)?.code === 'organization.membership_not_found'
    ) {
      return;
    }
  }

  if (!response.ok) {
    throw new ElasticError(`Could not delete user with Id: ${userId}`, { response });
  }
};
