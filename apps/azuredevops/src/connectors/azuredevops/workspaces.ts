import { z } from 'zod';
import { AzuredevopsError } from '@/connectors/common/error';
import { env } from '@/common/env';

export const workspaceSchema = z.object({
  AccountName: z.string(),
});

const getWorkspacesSchema = z.array(workspaceSchema).nonempty();

export const getWorkspaces = async (accessToken) => {
  const response = await fetch(`${env.AZUREDEVOPS_APP_INSTALL_URL}/_apis/accounts`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new AzuredevopsError('Failed to fetch workspaces', { response });
  }

  const resData: unknown = await response.json();

  const result = getWorkspacesSchema.safeParse(resData);

  if (!result.success) {
    throw new AzuredevopsError('Invalid workspace data structure', { response });
  }

  return result.data;
};
