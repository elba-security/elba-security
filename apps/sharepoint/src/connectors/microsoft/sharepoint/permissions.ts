import { logger } from '@elba-security/logger';
import { z } from 'zod';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';

const grantedUserSchema = z.object({
  displayName: z.string(),
  id: z.string(),
  email: z.string(),
});

const grantedToV2Schema = z.object({
  user: grantedUserSchema,
});

const grantedToIdentitiesV2Schema = z
  .array(
    z
      .object({
        user: grantedUserSchema.optional(),
      })
      .optional()
  )
  .transform((val, ctx) => {
    if (!val.length) return [];

    const filtered = val.filter((el) => el && Object.keys(el).length);

    if (!filtered.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No user permissions in array',
      });

      return z.NEVER;
    }

    return filtered;
  });

const basePSchema = z.object({
  id: z.string(),
  roles: z.array(z.string()),
  link: z
    .object({
      scope: z.string().optional(),
      webUrl: z.string().optional(),
    })
    .optional(),
  grantedToV2: grantedToV2Schema.optional(),
  grantedToIdentitiesV2: grantedToIdentitiesV2Schema.optional(),
});

// TODO: this should be tied to api response!
export const validateAndParsePermission = (
  data: z.infer<typeof basePSchema>
): // TODO: fix these types
| (Omit<z.infer<typeof basePSchema>, 'grantedToV2'> & {
      grantedToV2: z.infer<typeof grantedToV2Schema>;
    })
  | (Omit<z.infer<typeof basePSchema>, 'grantedToIdentitiesV2'> & {
      grantedToIdentitiesV2: z.infer<typeof grantedToIdentitiesV2Schema>;
    })
  | null => {
  const result = basePSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  const grantedToV2ParseResult = grantedToV2Schema.safeParse(result.data.grantedToV2);
  const grantedToIdentitiesV2ParseResult = grantedToIdentitiesV2Schema.safeParse(
    result.data.grantedToIdentitiesV2
  );
  if (grantedToV2ParseResult.success) {
    return {
      ...result.data,
      grantedToV2: grantedToV2ParseResult.data,
    };
  }
  if (grantedToIdentitiesV2ParseResult.success) {
    return {
      ...result.data,
      grantedToIdentitiesV2: grantedToIdentitiesV2ParseResult.data,
    };
  }
  logger.warn('Retrieved permission is invalid, or empty permissions array', result);
  return null;
};

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

export type MicrosoftDriveItemPermission = z.infer<typeof basePSchema>;

// TODO: REFACTOR
export const getAllItemPermissions = async ({
  token,
  siteId,
  driveId,
  itemId,
  skipToken = null,
}: GetPermissionsParams) => {
  const permissions: MicrosoftDriveItemPermission[] = [];
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
    for (const permission of result.permissions) {
      const parsedPermission = validateAndParsePermission(permission);
      if (parsedPermission) {
        permissions.push(parsedPermission);
      }
    }
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

  const data = (await response.json()) as MicrosoftPaginatedResponse<MicrosoftDriveItemPermission>;

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { permissions: data.value, nextSkipToken };
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
          (p) => p.user?.email && userEmailsSet.has(p.user.email)
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

  const data = (await response.json()) as MicrosoftDriveItemPermission;

  return data;
};
