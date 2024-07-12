import { z } from 'zod';
import { MicrosoftError } from '@/common/error';
import { env } from '@/common/env';
import {
  getTokenFromDeltaLinks,
  type MicrosoftDeltaPaginatedResponse,
} from '../commons/delta-links-parse';
import type { MicrosoftDriveItem } from '../sharepoint/items';

// TODO: this schema should extend drive item
const deltaSchema = z.object({
  id: z.string(),
  name: z.string(),
  webUrl: z.string(),
  createdBy: z.object({
    user: z.object({
      email: z.string().optional(),
      id: z.string().optional(),
      displayName: z.string(),
    }),
  }),
  lastModifiedDateTime: z.string(),
  folder: z
    .object({
      childCount: z.number(),
    })
    .optional(),
  parentReference: z.object({
    // TODO: needs this?
    id: z.string().optional(),
  }),
  deleted: z.object({ state: z.string() }).optional(),
});

// const deltaSchema = driveItemSchema.extend({
//   deleted: z.object({ state: z.string() }).optional(),
// });

export type Delta = z.infer<typeof deltaSchema>;

// deltaToken appears only on last pagination page.
// So I should fetch all previous pages and I should get the deltaToken, it should be there in all cases.
// So if I have no skipToken, I should have deltaToken then.

export const getDeltaItems = async ({
  token,
  siteId,
  driveId,
  isFirstSync,
  skipToken,
  deltaToken,
}: {
  token: string;
  siteId: string;
  driveId: string;
  isFirstSync: boolean | null;
  skipToken: string | null;
  deltaToken: string | null;
}) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/root/delta`);

  if (isFirstSync) {
    url.searchParams.append('$select', 'id');
    url.searchParams.append('$top', String(1000)); // TODO: why?
  } else {
    url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));
  }
  if (skipToken) {
    url.searchParams.append('token', skipToken);
  }
  if (deltaToken) {
    url.searchParams.append('token', deltaToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve delta', { response });
  }

  console.log({ responseData: await response.clone().text() });
  const data = (await response.json()) as MicrosoftDeltaPaginatedResponse<Delta>;

  const nextSkipToken = getTokenFromDeltaLinks(data['@odata.nextLink']);
  const newDeltaToken = getTokenFromDeltaLinks(data['@odata.deltaLink']);

  const items: { deleted: string[]; updated: MicrosoftDriveItem[] } = { deleted: [], updated: [] };
  for (const deltaItem of data.value) {
    const item = deltaSchema.safeParse(deltaItem);
    if (item.success) {
      if (item.data.deleted) {
        // TODO: log items delete state, check microsoft doc for updated etc
        items.deleted.push(item.data.id);
      } else {
        items.updated.push(item.data);
      }
    } else {
      console.log('Failed to parse delta item', deltaItem);
      // TODO: log or whatever
    }
  }

  return { items, nextSkipToken, newDeltaToken };
};
