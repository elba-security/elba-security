import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { MicrosoftError } from '@/common/error';
import { env } from '@/common/env';
import { driveItemSchema } from '../onedrive/items';
import { basePaginationSchema } from '../common/pagination';

const deltaTokenSchema = z
  .string()
  .url()
  .transform((link) => {
    const url = new URL(link);
    return (
      url.searchParams.get('token') ||
      url.searchParams.get('$skiptoken') ||
      url.searchParams.get('$deltatoken')
    );
  })
  .refine((token) => token !== null);

const microsoftDeltaPaginatedResponseSchema = z.union([
  basePaginationSchema.extend({
    '@odata.deltaLink': deltaTokenSchema,
  }),
  basePaginationSchema.extend({
    '@odata.nextLink': deltaTokenSchema,
  }),
]);

const deltaItemSchema = driveItemSchema.extend({
  deleted: z.object({ state: z.string() }).optional(),
});

export type DeltaItem = z.infer<typeof deltaItemSchema>;

export type ParsedDeltaItems = { deleted: string[]; updated: DeltaItem[] };

export const getDeltaItems = async ({
  token,
  userId,
  deltaToken,
}: {
  token: string;
  userId: string;
  deltaToken: string | null;
}): Promise<
  null | ({ items: ParsedDeltaItems } & ({ nextSkipToken: string } | { newDeltaToken: string }))
> => {
  const url = new URL(`${env.MICROSOFT_API_URL}/users/${userId}/drive/root/delta`);

  if (deltaToken) {
    url.searchParams.append('token', deltaToken);
  }

  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));
  url.searchParams.append('$select', Object.keys(deltaItemSchema.shape).join(','));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer:
        'hierarchicalsharing, deltashowremovedasdeleted, deltatraversepermissiongaps, deltashowsharingchanges',
    },
  });

  if (!response.ok) {
    const errorInfo = (await response.clone().json()) as object;

    logger.error('Onedrive delta items MS Graph error', errorInfo);

    if (response.status === 404) {
      return null;
    }

    // The delta token has expired, we need to re-run a full sync
    // https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0&tabs=http#response-2
    if (response.status === 410) {
      logger.warn('Onedrive delta token expired', {
        userId,
        errorInfo,
      });

      throw new MicrosoftError('Delta token expired', { response, code: 'DELTA_TOKEN_EXPIRED' });
    }

    throw new MicrosoftError('Could not retrieve items delta', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftDeltaPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse paginated delta items response', { data, error: result.error });
    throw new Error('Failed to parse paginated delta items response');
  }

  const items: ParsedDeltaItems = { deleted: [], updated: [] };
  const uniqueItems = new Map<string, DeltaItem>();
  for (const deltaItem of result.data.value) {
    const item = deltaItemSchema.safeParse(deltaItem);
    if (item.success) {
      // From the docs: https://learn.microsoft.com/en-us/graph/api/driveitem-delta?view=graph-rest-1.0&tabs=http#remarks
      // "The same item may appear more than once in a delta feed, for various reasons.
      // You should use the last occurrence you see."
      uniqueItems.set(item.data.id, item.data);
    } else {
      logger.error('Failed to parse delta item', { deltaItem, error: item.error });
    }
  }

  for (const item of uniqueItems.values()) {
    if (item.deleted) {
      items.deleted.push(item.id);
    } else {
      items.updated.push(item);
    }
  }

  if ('@odata.nextLink' in result.data) {
    return { items, nextSkipToken: result.data['@odata.nextLink'] };
  }

  return { items, newDeltaToken: result.data['@odata.deltaLink'] };
};

const userSchema = z.object({
  id: z.string(),
  userType: z.enum(['Member', 'Guest']).optional(),
});

const deltaUserSchema = userSchema.extend({
  '@removed': z.object({ reason: z.string() }).optional(),
});

export type User = z.infer<typeof userSchema>;

export type DeltaUser = z.infer<typeof deltaUserSchema>;

export type ParsedDeltaUsers = { deleted: string[]; updated: User[] };

export const getDeltaUsers = async ({
  tenantId,
  token,
  deltaToken,
  skipToken,
}: {
  tenantId: string;
  token: string;
  deltaToken?: string | null;
  skipToken?: string | null;
}): Promise<
  { users: ParsedDeltaUsers } & ({ nextSkipToken: string } | { newDeltaToken: string })
> => {
  const url = new URL(`${env.MICROSOFT_API_URL}/${tenantId}/users/delta`);

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }
  if (deltaToken) {
    url.searchParams.append('$deltatoken', deltaToken);
  }

  // The $top parameter doesn't work on users delta
  url.searchParams.append('$select', Object.keys(userSchema.shape).join(','));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve users delta', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftDeltaPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse paginated delta users response', { data, error: result.error });
    throw new Error('Failed to parse paginated delta users response');
  }

  const users: ParsedDeltaUsers = { deleted: [], updated: [] };
  for (const deltaUser of result.data.value) {
    const parsedUser = deltaUserSchema.safeParse(deltaUser);
    if (parsedUser.success) {
      if (parsedUser.data['@removed']) {
        users.deleted.push(parsedUser.data.id);
      } else {
        users.updated.push(parsedUser.data);
      }
    } else {
      logger.error('Failed to parse delta user', { deltaUser, error: parsedUser.error });
    }
  }

  if ('@odata.nextLink' in result.data) {
    return { users, nextSkipToken: result.data['@odata.nextLink'] };
  }

  return { users, newDeltaToken: result.data['@odata.deltaLink'] };
};
