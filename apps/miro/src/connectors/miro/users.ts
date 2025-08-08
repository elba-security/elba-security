import { z } from 'zod';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

const getUsersResponseSchema = z.object({
  data: z.array(z.unknown()),
  cursor: z.string().optional(),
});

export const miroUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
});

export type MiroUser = z.infer<typeof miroUserSchema>;

type GetUsersParams = {
  accessToken: string;
  orgId: string;
  page?: string | null;
};

export const getUsers = async ({ accessToken, orgId, page }: GetUsersParams) => {
  const url = new URL(`${env.MIRO_API_BASE_URL}/v2/orgs/${orgId}/members`);

  url.searchParams.append('active', 'true');
  url.searchParams.append('limit', `${env.MIRO_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('cursor', page);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError(`Could not retrieve users: ${response.status}`, { response });
  }

  const resData: unknown = await response.json();
  const resultData = getUsersResponseSchema.parse(resData);

  const validUsers: MiroUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of resultData.data) {
    const userResult = miroUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: resultData.cursor ?? null,
  };
};

const getTokenInfoSchema = z.object({
  organization: z.object({
    id: z.string(),
  }),
});

export const getTokenInfo = async (accessToken: string) => {
  const response = await fetch(`${env.MIRO_API_BASE_URL}/v1/oauth-token`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', { type: 'unauthorized' });
    }
    throw new IntegrationError(`Failed to fetch token info: ${response.status}`, { response });
  }

  const resData: unknown = await response.json();

  const result = getTokenInfoSchema.safeParse(resData);

  if (!result.success) {
    throw new IntegrationError('Invalid token info data structure', {});
  }

  return result.data.organization.id;
};
