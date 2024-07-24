import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { MicrosoftError } from '@/common/error';
import { env } from '@/common/env';
import { driveItemSchema } from '../sharepoint/items';
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
  siteId,
  driveId,
  deltaToken,
}: {
  token: string;
  siteId: string;
  driveId: string;
  deltaToken: string | null;
}): Promise<
  { items: ParsedDeltaItems } & ({ nextSkipToken: string } | { newDeltaToken: string })
> => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/root/delta`);

  url.searchParams.append('token', deltaToken || 'latest');
  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));
  url.searchParams.append('$select', Object.keys(deltaItemSchema.shape).join(','));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'deltashowremovedasdeleted, deltatraversepermissiongaps, deltashowsharingchanges',
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve delta', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftDeltaPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse paginated delta response', { data, error: result.error });
    throw new Error('Failed to parse delta paginated response');
  }

  const items: ParsedDeltaItems = { deleted: [], updated: [] };
  for (const deltaItem of result.data.value) {
    const item = deltaItemSchema.safeParse(deltaItem);
    if (item.success) {
      if (item.data.deleted) {
        items.deleted.push(item.data.id);
      } else {
        items.updated.push(item.data);
      }
    } else {
      logger.error('Failed to parse delta item', { deltaItem, error: item.error });
    }
  }

  if ('@odata.nextLink' in result.data) {
    return { items, nextSkipToken: result.data['@odata.nextLink'] };
  }

  return { items, newDeltaToken: result.data['@odata.deltaLink'] };
};
