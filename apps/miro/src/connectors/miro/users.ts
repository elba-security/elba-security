import { z } from 'zod';
import { env } from '@/common/env';
import { MiroError } from '@/connectors/common/error';

const getUsersResponseSchema = z.object({
  data: z.array(z.unknown()),
  cursor: z.string().optional(),
});

export const miroUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
});

export type GetUsersParams = {
  token: string;
  orgId: string;
  page?: string | null;
};

export type MiroUser = z.infer<typeof miroUserSchema>;

export const getUsers = async ({ token, orgId, page }: GetUsersParams) => {
  const url = new URL(`${env.MIRO_API_BASE_URL}/v2/orgs/${orgId}/members`);

  url.searchParams.append('active', 'true');
  url.searchParams.append('limit', `${env.MIRO_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('cursor', page);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new MiroError('Could not retrieve users', { response });
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

const getWorkspacesSchema = z.object({
  organization: z.object({
    id: z.string(),
  }),
});

export const getTokenInfo = async (token: string) => {
  const response = await fetch(`${env.MIRO_API_BASE_URL}/v1/oauth-token`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MiroError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getWorkspacesSchema.safeParse(resData);

  if (!result.success) {
    throw new MiroError('Invalid workspace data structure', { response });
  }

  return result.data.organization.id;
};
