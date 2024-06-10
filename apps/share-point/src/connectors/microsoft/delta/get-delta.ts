import { z } from 'zod';
import { MicrosoftError } from '@/common/error';
import { env } from '@/common/env';
import {
  getTokenFromDeltaLinks,
  type MicrosoftDeltaPaginatedResponse,
} from '../commons/delta-links-parse';

type GetDelta = {
  token: string;
  siteId: string;
  driveId: string;
  isFirstSync: boolean | null;
  skipToken: string | null;
  deltaToken: string | null;
};

const deltaSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  webUrl: z.string().optional(),
  createdBy: z
    .object({
      user: z.object({
        email: z.string().optional(),
        id: z.string().optional(),
        displayName: z.string(),
      }),
    })
    .optional(),
  parentReference: z.object({
    id: z.string().optional(),
  }),
  deleted: z.object({ state: z.string() }).optional(),
});

export type Delta = z.infer<typeof deltaSchema>;

// deltaToken appears only on last pagination page.
// So I should fetch all previous pages and I should get the deltaToken, it should be there in all cases.
// So if I have no skipToken, I should have deltaToken then.

export const getDelta = async ({
  token,
  siteId,
  driveId,
  isFirstSync,
  skipToken,
  deltaToken,
}: GetDelta) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives/${driveId}/root/delta`);

  if (isFirstSync) {
    url.searchParams.append('$select', 'id');
    url.searchParams.append('$top', String(1000));
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

  const data = (await response.json()) as MicrosoftDeltaPaginatedResponse<Delta>;

  const nextSkipToken = getTokenFromDeltaLinks(data['@odata.nextLink']);
  const newDeltaToken = getTokenFromDeltaLinks(data['@odata.deltaLink']);

  const delta = data.value.reduce<Delta[]>((acc, item) => {
    const parsed = deltaSchema.safeParse(item);
    if (parsed.success) acc.push(item);

    return acc;
  }, []);

  return { delta, nextSkipToken, newDeltaToken };
};
