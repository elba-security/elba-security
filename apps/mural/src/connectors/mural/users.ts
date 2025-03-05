import { z } from 'zod';
import { env } from '@/common/env';
import { MuralMultipleWorkspaceError, MuralError } from '@/connectors/common/error';

const getUsersResponseSchema = z.object({
  value: z.array(z.unknown()),
  next: z.string().optional(),
});

export const muralUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
});

export type GetUsersParams = {
  token: string;
  muralId: string;
  page?: string | null;
};

export type MuralUser = z.infer<typeof muralUserSchema>;

export const getUsers = async ({ token, muralId, page }: GetUsersParams) => {
  const url = new URL(`${env.MURAL_API_BASE_URL}/murals/${muralId}/users`);

  url.searchParams.append('limit', `${env.MURAL_USERS_SYNC_BATCH_SIZE}`);

  if (page) {
    url.searchParams.append('next', page);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new MuralError('Could not retrieve users', { response });
  }

  const resData: unknown = await response.json();
  const resultData = getUsersResponseSchema.parse(resData);

  const validUsers: MuralUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const user of resultData.value) {
    const userResult = muralUserSchema.safeParse(user);
    if (userResult.success) {
      validUsers.push(userResult.data);
    } else {
      invalidUsers.push(user);
    }
  }

  return {
    validUsers,
    invalidUsers,
    nextPage: validUsers.length > 0 ? resultData.next ?? null : null, // They return the next param even when users are an empty array
  };
};

export const workspaceSchema = z.object({
  id: z.string(),
  suspended: z.boolean(),
});

const getWorkspacesSchema = z.object({
  value: z.array(workspaceSchema).nonempty(),
});

export const getWorkspaceIds = async (token: string) => {
  const response = await fetch(`${env.MURAL_API_BASE_URL}/workspaces`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MuralError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getWorkspacesSchema.safeParse(resData);

  if (!result.success) {
    throw new MuralError('Invalid workspace data structure', { response });
  }

  const workspaceIds = result.data.value
    .filter((workspace) => !workspace.suspended)
    .map((workspace) => workspace.id);

  if (!workspaceIds[0]) {
    throw new MuralError('workspace not found', { response });
  }
  if (workspaceIds.length > 1) {
    throw new MuralMultipleWorkspaceError('User has selected multiple workspaces');
  }
  return workspaceIds[0];
};

export const muralSchema = z.object({
  id: z.string(),
});

const getMuralsSchema = z.object({
  value: z.array(muralSchema).nonempty(),
});

export const getMurals = async ({ token, workspaceId }: { token: string; workspaceId: string }) => {
  const response = await fetch(`${env.MURAL_API_BASE_URL}/workspaces/${workspaceId}/murals`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MuralError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getMuralsSchema.safeParse(resData);

  if (!result.success) {
    throw new MuralError('Invalid workspace data structure', { response });
  }

  return result.data.value[0].id;
};
