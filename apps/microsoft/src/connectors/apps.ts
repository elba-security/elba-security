import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from './commons/error';
import type { MicrosoftPaginatedResponse } from './commons/pagination';
import { getNextSkipTokenFromNextLink } from './commons/pagination';

const AppSchema = z.object({
  id: z.string(),
  description: z.string().nullish(),
  homepage: z.string().nullish(),
  oauth2PermissionScopes: z.array(z.string()),
  appDisplayName: z.string(),
  appRoleAssignedTo: z.array(
    z.object({
      id: z.string().nullish(),
      principalId: z.string().nullish(),
    })
  ),
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

export type MicrosoftApp = z.infer<typeof AppSchema>;

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

  for (const user of data.value) {
    const result = AppSchema.safeParse(user);
    if (result.success) {
      validApps.push(result.data);
    } else {
      invalidApps.push(user);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { validApps, invalidApps, nextSkipToken };
};
