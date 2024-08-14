import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { env } from '@/common/env';
import { MicrosoftError } from '@/common/error';
import { microsoftPaginatedResponseSchema } from '../common/pagination';

const driveSchema = z.object({
  id: z.string(),
});

type GetDrivesParams = {
  token: string;
  siteId: string;
  skipToken: string | null;
};

export type MicrosoftDrive = z.infer<typeof driveSchema>;

export const getDrives = async ({ token, siteId, skipToken }: GetDrivesParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/sites/${siteId}/drives`);
  url.searchParams.append('$top', String(env.MICROSOFT_DATA_PROTECTION_SYNC_CHUNK_SIZE));
  url.searchParams.append('$select', 'id');

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve drives', { response });
  }

  const data: unknown = await response.json();
  const result = microsoftPaginatedResponseSchema.safeParse(data);
  if (!result.success) {
    logger.error('Failed to parse paginated drives response', { data, errror: result.error });
    throw new Error('Could not parse drives');
  }

  const nextSkipToken = result.data['@odata.nextLink'];
  const driveIds: string[] = [];
  for (const drive of result.data.value) {
    const parsedDrive = driveSchema.safeParse(drive);
    if (parsedDrive.success) {
      driveIds.push(parsedDrive.data.id);
    } else {
      logger.error('Failed to parse drive while getting drives', {
        drive,
        error: parsedDrive.error,
      });
    }
  }

  return { driveIds, nextSkipToken };
};
