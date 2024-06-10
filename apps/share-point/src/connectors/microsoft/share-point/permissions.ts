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

export const validateAndParsePermission = (
  data: z.infer<typeof basePSchema>
):
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

export type MicrosoftDriveItemPermissions = z.infer<typeof basePSchema>;

export const getAllItemPermissions = async ({
  token,
  siteId,
  driveId,
  itemId,
  skipToken = null,
}: GetPermissionsParams) => {
  const { permissions, nextSkipToken } = await getItemPermissions({
    token,
    siteId,
    driveId,
    itemId,
    skipToken,
  });

  if (nextSkipToken) {
    const nextData = await getAllItemPermissions({
      token,
      siteId,
      driveId,
      itemId,
      skipToken: nextSkipToken,
    });

    permissions.push(...nextData.permissions);
  }

  const parsedPermissions = permissions.reduce<MicrosoftDriveItemPermissions[]>((acc, el) => {
    const parsedPermission = validateAndParsePermission(el);
    if (parsedPermission !== null) acc.push(parsedPermission);

    return acc;
  }, []);

  return { permissions: parsedPermissions, nextSkipToken };
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

  const data = (await response.json()) as MicrosoftPaginatedResponse<MicrosoftDriveItemPermissions>;

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { permissions: data.value, nextSkipToken };
};

export const deleteItemPermission = async ({
  token,
  siteId,
  driveId,
  itemId,
  permissionId,
}: DeleteItemPermissionParams): Promise<void> => {
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
    throw new MicrosoftError('Could not delete permission', { response });
  }
};
