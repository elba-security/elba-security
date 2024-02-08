import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from './commons/error';
import type { MicrosoftPaginatedResponse } from './commons/pagination';
import { getNextSkipTokenFromNextLink } from './commons/pagination';

const appPermissionSchema = z.object({
  id: z.string().nullish(),
  principalId: z.string().nullish(),
});

const appSchema = z.object({
  id: z.string(),
  description: z.string().nullish(),
  homepage: z.string().nullish(),
  oauth2PermissionScopes: z.array(z.string()),
  appDisplayName: z.string(),
  appRoleAssignedTo: z.array(appPermissionSchema),
  info: z
    .object({
      logoUrl: z.string().nullish(),
    })
    .nullish(),
  verifiedPublisher: z
    .object({
      displayName: z.string().nullish(),
    })
    .nullish(),
});

export type MicrosoftAppPermission = z.infer<typeof appPermissionSchema>;

export type MicrosoftApp = z.infer<typeof appSchema>;

export type GetAppsParams = {
  token: string;
  tenantId: string;
  skipToken: string | null;
};

export const getApps = async ({ tenantId, token, skipToken }: GetAppsParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/${tenantId}/servicePrincipals`);
  url.searchParams.append('$top', String(env.THIRD_PARTY_APPS_SYNC_BATCH_SIZE));
  url.searchParams.append(
    '$select',
    'appDisplayName,description,id,homepage,info,verifiedPublisher,oauth2PermissionScopes'
  );
  url.searchParams.append(
    '$filter',
    "tags/Any(x: x eq 'WindowsAzureActiveDirectoryIntegratedApp')"
  );
  url.searchParams.append('$expand', 'appRoleAssignedTo');
  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve apps', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const validApps: MicrosoftApp[] = [];
  const invalidApps: unknown[] = [];

  for (const app of data.value) {
    const result = appSchema.safeParse(app);
    if (result.success) {
      validApps.push(result.data);
    } else {
      invalidApps.push(app);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { validApps, invalidApps, nextSkipToken };
};

export type GetAppParams = {
  token: string;
  tenantId: string;
  appId: string;
};

export const getApp = async ({ tenantId, token, appId }: GetAppParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/${tenantId}/servicePrincipals/${appId}`);
  url.searchParams.append('$top', String(env.THIRD_PARTY_APPS_SYNC_BATCH_SIZE));
  url.searchParams.append(
    '$select',
    'appDisplayName,description,id,homepage,info,verifiedPublisher,oauth2PermissionScopes'
  );
  url.searchParams.append('$expand', 'appRoleAssignedTo');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new MicrosoftError('Could not retrieve apps', { response });
  }

  const data: unknown = await response.json();
  const result = appSchema.safeParse(data);

  if (!result.success) {
    return null;
  }
  return result.data;
};

type DeleteAppPermissionsParams = {
  tenantId: string;
  appId: string;
  token: string;
  permissionId: string;
};

export const deleteAppPermission = async ({
  token,
  tenantId,
  appId,
  permissionId,
}: DeleteAppPermissionsParams) => {
  const response = await fetch(
    `${env.MICROSOFT_API_URL}/${tenantId}/servicePrincipals/${appId}/appRoleAssignedTo/${permissionId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }
    throw new MicrosoftError('Could not delete app user permission', { response });
  }
};
