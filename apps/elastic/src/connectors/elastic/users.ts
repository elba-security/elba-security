import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { ElasticError } from '../common/error';

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
});

const elasticOwnerIdResponseSchema = z.object({
  id: z.string(),
});
export type GetUsersParams = {
  apiKey: string;
  organizationId: string;
  page?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  organizationId: string;
  apiKey: string;
};

export const getAllUsers = async ({ apiKey, page, organizationId }: GetUsersParams) => {
  const url = new URL(`${env.ELASTIC_API_BASE_URL}/api/v1/organizations/${organizationId}/members`);

  if (page) {
    url.searchParams.append('from', String(page));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ElasticError('Could not retrieve Elastic users', { response });
  }

  const resData: unknown = await response.json();

  const { members } = elasticResponseSchema.parse(resData);

  const validUsers: ElasticUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of members) {
    const userResult = elasticUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
  };
};

export const deleteUser = async ({ apiKey, userId, organizationId }: DeleteUsersParams) => {
  const url = `${env.ELASTIC_API_BASE_URL}/api/v1/organizations/${organizationId}/members/${userId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new ElasticError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const getOwnerId = async ({ apiKey }: { apiKey: string }) => {
  const url = new URL(`${env.ELASTIC_API_BASE_URL}/api/v1/account`);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `ApiKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new ElasticError('Could not retrieve owner id', { response });
  }

  const resData: unknown = await response.json();

  const result = elasticOwnerIdResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Elastic owner id response', { resData });
    throw new ElasticError('Invalid Elastic owner id response');
  }

  return {
    ownerId: result.data.id,
  };
};
