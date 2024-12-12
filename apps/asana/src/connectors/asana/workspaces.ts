import { z } from 'zod';
import { env } from '@/common/env';
import { AsanaError } from '../common/error';

const workspaceResponseSchema = z.object({
  data: z.array(
    z.object({
      gid: z.string(),
    })
  ),
});

export const getWorkspaceIds = async (accessToken: string) => {
  const response = await fetch(`${env.ASANA_API_BASE_URL}/workspaces`, {
    method: 'get',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new AsanaError('Could not retrieve workspace', { response });
  }

  const resData: unknown = await response.json();

  const result = workspaceResponseSchema.safeParse(resData);

  if (!result.success) {
    throw new AsanaError('Could not parse workspace response');
  }

  if (result.data.data.length === 0) {
    throw new AsanaError('No workspace found');
  }

  const workspaceIds = result.data.data.map((board) => board.gid);

  if (!workspaceIds.length) {
    throw new AsanaError('No Main workspace found');
  }

  return workspaceIds;
};
