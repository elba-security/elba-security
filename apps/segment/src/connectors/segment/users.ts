import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { IntegrationError, IntegrationConnectionError } from '@elba-security/common';
import { env } from '@/common/env';

const segmentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

export type SegmentUser = z.infer<typeof segmentUserSchema>;

const segmentResponseSchema = z.object({
  data: z.object({
    users: z.array(z.unknown()),
    pagination: z.object({
      next: z.string().optional(),
    }),
  }),
});

export type GetUsersParams = {
  accessToken: string;
  cursor?: string | null;
};

export type DeleteUsersParams = {
  userId: string;
  accessToken: string;
};

const workspaceNameResponseSchema = z.object({
  data: z.object({
    workspace: z.object({
      name: z.string(),
    }),
  }),
});

export const getUsers = async ({ accessToken, cursor }: GetUsersParams) => {
  const endpoint = new URL(`${env.SEGMENT_API_BASE_URL}/users`);
  endpoint.searchParams.append('pagination.count', String(env.SEGMENT_USERS_SYNC_BATCH_SIZE));

  if (cursor) {
    endpoint.searchParams.append('pagination.cursor', cursor);
  }

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError('API request failed', { response });
  }

  const resData: unknown = await response.json();

  const { data } = segmentResponseSchema.parse(resData);

  const validUsers: SegmentUser[] = [];
  const invalidUsers: unknown[] = [];

  for (const node of data.users) {
    const result = segmentUserSchema.safeParse(node);

    if (result.success) {
      validUsers.push(result.data);
    } else {
      invalidUsers.push(node);
    }
  }

  const nextPage = data.pagination.next;
  return {
    validUsers,
    invalidUsers,
    nextPage: nextPage ? nextPage : null,
  };
};

export const deleteUser = async ({ userId, accessToken }: DeleteUsersParams) => {
  const url = new URL(`${env.SEGMENT_API_BASE_URL}/users?userIds.0=${userId}`);
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError(`Could not delete user with Id: ${userId}`, { response });
  }
};

export const getWorkspaceName = async ({ accessToken }: { accessToken: string }) => {
  const url = new URL(env.SEGMENT_API_BASE_URL);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new IntegrationConnectionError('Unauthorized', {
        response,
        type: 'unauthorized',
      });
    }
    throw new IntegrationError('Could not retrieve workspace name', { response });
  }

  const resData: unknown = await response.json();

  const result = workspaceNameResponseSchema.safeParse(resData);
  if (!result.success) {
    logger.error('Invalid Segment workspace name response', { resData });
    throw new IntegrationError('Invalid Segment workspace name response', { response });
  }

  return {
    workspaceName: result.data.data.workspace.name,
  };
};
