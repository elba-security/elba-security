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
    return url.searchParams.get('token');
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
    if (response.status === 404) {
      return null;
    }

    throw new MicrosoftError('Could not retrieve delta', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftDeltaPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse paginated delta response', { data, error: result.error });
    throw new Error('Failed to parse delta paginated response');
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
