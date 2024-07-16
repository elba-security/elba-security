import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import {
  getNextSkipTokenFromNextLink,
  microsoftPaginatedResponseSchema,
} from '../commons/pagination';

const sharepointUserPermissionSchema = z.object({
  displayName: z.string(),
  id: z.string().optional(), // When sharing to a non Microsoft user email address, the id is not present
  email: z.string(),
});

const sharepointPermissionSchema = z.object({
  id: z.string(),
  roles: z.array(z.string()),
  link: z
    .object({
      scope: z.string().optional(),
      webUrl: z.string().optional(),
    })
    .optional(),
  grantedToV2: z.object({
    user: sharepointUserPermissionSchema.optional(),
  }),
  grantedToIdentitiesV2: z
    .array(
      z.object({
        user: sharepointUserPermissionSchema.optional(),
      })
    )
    .optional(),
});

type SharepointPermission = z.infer<typeof sharepointPermissionSchema>;

// TODO: this should be tied to api response!
// export const validateAndParsePermission = (data: Permission) => {
//   const result = permissionSchema.safeParse(data);

//   if (!result.success) {
//     console.error('INVALID permission', data);
//     return null;
//   }

//   const grantedToV2ParseResult = grantedToV2Schema.safeParse(result.data.grantedToV2);
//   const grantedToIdentitiesV2ParseResult = grantedToIdentitiesV2Schema.safeParse(
//     result.data.grantedToIdentitiesV2
//   );
//   if (grantedToV2ParseResult.success) {
//     return {
//       ...result.data,
//       grantedToV2: grantedToV2ParseResult.data,
//     };
//   }
//   if (grantedToIdentitiesV2ParseResult.success) {
//     return {
//       ...result.data,
//       grantedToIdentitiesV2: grantedToIdentitiesV2ParseResult.data,
//     };
//   }
//   logger.warn('Retrieved permission is invalid, or empty permissions array', result);
//   return null;
// };

type GetPermissionsParams = {
  token: string;
  siteId: string;
  driveId: string;
  itemId: string;
  skipToken?: string | null;
};

type DeleteItemPermissionParams = GetPermissionsParams & {
  permissionId: string;
};

type RevokeUserFromLinkPermissionParams = DeleteItemPermissionParams & {
  userEmails: string[];
};

// TODO: REFACTOR
export const getAllItemPermissions = async ({
  token,
  siteId,
  driveId,
  itemId,
  skipToken = null,
}: GetPermissionsParams) => {
  const permissions: SharepointPermission[] = [];
  let nextSkipToken;
  do {
    const result = await getItemPermissions({
      token,
      siteId,
      driveId,
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
  siteId,
  driveId,
  itemId,
  skipToken,
}: GetPermissionsParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/items/${itemId}/permissions`
  );

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

  const permissions: SharepointPermission[] = [];
  for (const permission of result.data.value) {
    const parsedPermission = sharepointPermissionSchema.safeParse(permission);
    if (parsedPermission.success) {
      permissions.push(parsedPermission.data);
    } else {
      console.error('Failed to parse permission while getting item permissions', permission);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(result.data['@odata.nextLink']);

  return { permissions, nextSkipToken };
};

export const deleteItemPermission = async ({
  token,
  siteId,
  driveId,
  itemId,
  permissionId,
}: DeleteItemPermissionParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/items/${itemId}/permissions/${permissionId}`
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
  siteId,
  driveId,
  itemId,
  permissionId,
  userEmails,
}: RevokeUserFromLinkPermissionParams) => {
  const url = new URL(
    `https://graph.microsoft.com/beta/sites/${siteId}/drives/${driveId}/items/${itemId}/permissions/${permissionId}/revokeGrants`
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
        siteId,
        driveId,
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

    throw new MicrosoftError('Could not revoke permission', { response });
  }

  return 'deleted';
};

export const getPermissionDetails = async ({
  token,
  siteId,
  driveId,
  itemId,
  permissionId,
}: DeleteItemPermissionParams) => {
  const url = new URL(
    `${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/items/${itemId}/permissions/${permissionId}`
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

  const parsedPermission = sharepointPermissionSchema.safeParse(data);
  if (!parsedPermission.success) {
    // TODO
    console.error('Failed to parse permission while getting permission details', data);
    throw new Error('Failed to parse permission');
  }
  return parsedPermission.data;
};
