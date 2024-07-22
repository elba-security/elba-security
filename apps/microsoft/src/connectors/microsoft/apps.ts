import { z } from 'zod';
import { logger } from '@elba-security/logger';
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

const appOAuthGrantSchema = z.object({
  id: z.string().min(1),
  principalId: z.string().min(1),
  scope: z.string(),
});

export type MicrosoftAppOauthGrant = z.infer<typeof appOAuthGrantSchema>;

export type MicrosoftAppWithOauthGrants = MicrosoftApp & {
  oauthGrants: MicrosoftAppOauthGrant[];
};

export type GetAppOauthGrantsParams = {
  token: string;
  tenantId: string;
  appId: string;
  skipToken: string | null;
};

export const getAppOauthGrants = async ({
  token,
  tenantId,
  appId,
  skipToken,
}: GetAppOauthGrantsParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/${tenantId}/servicePrincipals/${appId}/oauth2PermissionGrants`
  );

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve app members', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const validAppOauthGrants: MicrosoftAppOauthGrant[] = [];
  const invalidAppOauthGrants: unknown[] = [];

  for (const appOauthGrant of data.value) {
    const result = appOAuthGrantSchema.safeParse(appOauthGrant);
    if (result.success) {
      validAppOauthGrants.push(result.data);
    } else {
      invalidAppOauthGrants.push(appOauthGrant);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return {
    validAppOauthGrants,
    invalidAppOauthGrants,
    nextSkipToken,
  };
};

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
    logger.error('Could not retrieve apps', {
      response: {
        status: response.status,
        body: await response.clone().text(),
      },
    });
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
    logger.error('Could not retrieve app', {
      response: {
        status: response.status,
        body: await response.clone().text(),
      },
    });
    throw new MicrosoftError('Could not retrieve app', { response });
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

  if (!response.ok && response.status !== 404) {
    logger.error('Could not delete app permission', {
      response: {
        status: response.status,
        body: await response.clone().text(),
      },
    });
    throw new MicrosoftError('Could not delete app user permission', { response });
  }
};

type DeleteOauthGrantParams = {
  token: string;
  oauthGrantId: string;
};

export const deleteOauthGrant = async ({ token, oauthGrantId }: DeleteOauthGrantParams) => {
  const response = await fetch(`${env.MICROSOFT_API_URL}/oauth2PermissionGrants/${oauthGrantId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    logger.error('Could not delete oauth grant', {
      response: {
        status: response.status,
        body: await response.clone().text(),
      },
    });
    throw new MicrosoftError('Could not delete oauth grant', { response });
  }
};
