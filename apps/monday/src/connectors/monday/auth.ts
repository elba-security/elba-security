import { z } from 'zod';
import { env } from '@/common/env';
import { MondayError } from '../common/error';

const adminTokenSchema = z.object({
  data: z.object({
    me: z.object({
      is_admin: z.boolean(),
    }),
  }),
});

const workspaceSchema = z.object({
  data: z.object({
    workspaces: z.array(
      z.object({
        id: z.string().min(1),
      })
    ),
  }),
});

export const isAdminToken = async (token: string) => {
  const query = `
    query {
      me {
        is_admin
      }
    }
  `;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'API-Version': env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve token information', { response });
  }

  const resData: unknown = await response.json();

  const result = adminTokenSchema.safeParse(resData);

  if (!result.success) {
    throw new MondayError('Could not parse token response');
  }

  return result.data.data.me.is_admin;
};

export const getWorkspaceIds = async (accessToken: string) => {
  const query = `
    query {
      workspaces {
        id
      }
    }
  `;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'API-Version': env.MONDAY_API_VERSION,
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = workspaceSchema.safeParse(resData);

  if (!result.success) {
    throw new MondayError('Could not parse workspace response');
  }

  if (result.data.data.workspaces.length === 0) {
    throw new MondayError('No workspace found');
  }

  const workspaceIds = result.data.data.workspaces.map(({ id }) => id);

  return workspaceIds;
};
