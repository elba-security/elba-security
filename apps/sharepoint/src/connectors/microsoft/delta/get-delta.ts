import { z } from 'zod';
import { MicrosoftError } from '@/common/error';
import { env } from '@/common/env';
import { driveItemSchema, type MicrosoftDriveItem } from '../sharepoint/items';
import { basePaginationSchema } from '../commons/pagination';

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

const deltaSchema = driveItemSchema.extend({
  deleted: z.object({ state: z.string() }).optional(),
});

export type Delta = z.infer<typeof deltaSchema>;

export const getDeltaItems = async ({
  token,
  siteId,
  driveId,
  skipToken,
  deltaToken,
}: {
  token: string;
  siteId: string;
  driveId: string;
  skipToken: string | null;
  deltaToken: string | null;
}) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/root/delta`);

  url.searchParams.append('token', skipToken || deltaToken || 'latest');
  url.searchParams.append('$top', '1'); // TODO
  // url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'deltashowremovedasdeleted, deltatraversepermissiongaps, deltashowsharingchanges',
    },
  });

  console.log('------- DELTA RESPONSE -------');
  console.log(await response.clone().text());

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve delta', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftDeltaPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    // TODO
    console.error('Failed to parse paginated delta response', { data, error: result.error });
    throw new Error('Failed to parse delta paginated response');
  }

  const items: { deleted: string[]; updated: MicrosoftDriveItem[] } = { deleted: [], updated: [] };
  for (const deltaItem of result.data.value) {
    const item = deltaSchema.safeParse(deltaItem);
    if (item.success) {
      if (item.data.deleted) {
        // TODO: log items delete state, check microsoft doc for updated etc
        items.deleted.push(item.data.id);
      } else {
        items.updated.push(item.data);
      }
    } else {
      console.log('Failed to parse delta item', { deltaItem, error: item.error });
      // TODO: log or whatever
    }
  }

  if ('@odata.nextLink' in result.data) {
    return { items, nextSkipToken: result.data['@odata.nextLink'] };
  }

  return { items, newDeltaToken: result.data['@odata.deltaLink'] };
};
