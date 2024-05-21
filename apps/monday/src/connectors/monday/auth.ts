import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MondayError } from '../common/error';

const tokenResponseSchema = z.object({
  access_token: z.string(),
});

const workspaceSchema = z.object({
  workspace_id: z.string(),
  workspace: z.object({
    is_default_workspace: z.boolean(),
  }),
});

const boardsSchema = z.object({
  data: z.object({
    boards: z.array(workspaceSchema),
  }),
});

export const getToken = async (code: string) => {
  const response = await fetch(`${env.MONDAY_APP_INSTALL_URL}/token`, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({
      client_id: env.MONDAY_CLIENT_ID,
      client_secret: env.MONDAY_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve token', { response });
  }

  const data: unknown = await response.json();

  const result = tokenResponseSchema.safeParse(data);

  if (!result.success) {
    logger.error('Invalid Monday token response', { data });
    throw new MondayError('Invalid Monday token response');
  }

  return {
    accessToken: result.data.access_token,
  };
};

export const getWorkspaceIds = async (accessToken: string) => {
  const query = `
    query GetWorkspace{
      boards {
        workspace_id
        workspace {
          is_default_workspace
        }
      }
    }
  `;

  const response = await fetch(env.MONDAY_API_BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
    }),
  });

  if (!response.ok) {
    throw new MondayError('Could not retrieve workspace');
  }

  const resData: unknown = await response.json();

  const result = boardsSchema.safeParse(resData);

  if (!result.success) {
    throw new MondayError('Could not parse workspace response');
  }

  if (result.data.data.boards.length === 0) {
    throw new MondayError('No workspace found');
  }

  const workspaceIds = result.data.data.boards.map((board) => board.workspace_id);

  if (!workspaceIds.length) {
    throw new MondayError('No Main workspace found');
  }

  return workspaceIds;
};
