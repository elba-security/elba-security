import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { microsoftPaginatedResponseSchema } from '../common/pagination';

const onedriveUserPermissionSchema = z.object({
  email: z.string(),
});

const onedrivePermissionSchema = z.object({
  id: z.string(),
  link: z
    .object({
      scope: z.string().optional(),
      webUrl: z.string().optional(),
    })
    .optional(),
  grantedToV2: z
    .object({
      user: onedriveUserPermissionSchema.optional(),
    })
    .optional(),
  grantedToIdentitiesV2: z
    .array(
      z.object({
        user: onedriveUserPermissionSchema.optional(),
      })
    )
    .optional(),
});

export type OnedrivePermission = z.infer<typeof onedrivePermissionSchema>;

type GetPermissionsParams = {
  token: string;
  userId: string;
  itemId: string;
  skipToken?: string | null;
};

type DeleteItemPermissionParams = GetPermissionsParams & {
  permissionId: string;
};

type RevokeUserFromLinkPermissionParams = DeleteItemPermissionParams & {
  userEmails: string[];
};

export const getAllItemPermissions = async ({
  token,
  userId,
  itemId,
  skipToken = null,
}: GetPermissionsParams) => {
  const permissions: OnedrivePermission[] = [];
  let nextSkipToken;
  do {
    const result = await getItemPermissions({
      token,
      userId,
      itemId,
      skipToken,
    });
    nextSkipToken = result.nextSkipToken;
    permissions.push(...result.permissions);
  } while (nextSkipToken);

  return permissions;
};

export const getItemPermissions = async ({
  token,
  userId,
  itemId,
  skipToken,
}: GetPermissionsParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/users/${userId}/drive/items/${itemId}/permissions`);

  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve permissions', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    throw new Error('Failed to parse page');
  }

  const permissions: OnedrivePermission[] = [];
  for (const permission of result.data.value) {
    const parsedPermission = onedrivePermissionSchema.safeParse(permission);
    if (parsedPermission.success) {
      permissions.push(parsedPermission.data);
    } else {
      logger.error('Failed to parse permission while getting item permissions', {
        permission,
        error: parsedPermission.error,
      });
    }
  }

  const nextSkipToken = result.data['@odata.nextLink'];

  return { permissions, nextSkipToken };
};

export const deleteItemPermission = async ({
  token,
  userId,
  itemId,
  permissionId,
}: DeleteItemPermissionParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/users/${userId}/drive/items/${itemId}/permissions/${permissionId}`
  );

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return 'ignored';
    }

    throw new MicrosoftError('Could not delete permission', { response });
  }

  return 'deleted';
};

export const revokeUsersFromLinkPermission = async ({
  token,
  userId,
  itemId,
  permissionId,
  userEmails,
}: RevokeUserFromLinkPermissionParams) => {
  const url = new URL(
    `https://graph.microsoft.com/beta/users/${userId}/drive/items/${itemId}/permissions/${permissionId}/revokeGrants`
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grantees: userEmails.map((email) => ({ email })),
    }),
  });

  if (!response.ok) {
    if (response.status === 500 && userEmails.length) {
      const permission = await getPermissionDetails({
        token,
        userId,
        itemId,
        permissionId,
      });

      if (permission.link?.scope === 'users' && permission.grantedToIdentitiesV2) {
        const userEmailsSet = new Set(userEmails);
        const hasMatchingEmail = permission.grantedToIdentitiesV2.some(
          (identity) => identity.user?.email && userEmailsSet.has(identity.user.email)
        );

        if (!hasMatchingEmail) {
          return 'ignored';
        }
      }
    }

    throw new MicrosoftError('Could not revoke users link permission', { response });
  }

  return 'deleted';
};

export const getPermissionDetails = async ({
  token,
  userId,
  itemId,
  permissionId,
}: DeleteItemPermissionParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/users/${userId}/drive/items/${itemId}/permissions/${permissionId}`
  );

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not get permission', { response });
  }

  const data: unknown = await response.json();

  const parsedPermission = onedrivePermissionSchema.safeParse(data);
  if (!parsedPermission.success) {
    logger.error('Failed to parse permission while getting permission details', {
      data,
      error: parsedPermission.error,
    });
    throw new Error('Failed to parse permission');
  }
  return parsedPermission.data;
};
