import { z } from 'zod';
import { env } from '@/env';
import { decrypt } from '@/common/crypto';
import { MicrosoftError } from '../commons/error';
import {
  getNextSkipTokenFromNextLink,
  type MicrosoftPaginatedResponse,
} from '../commons/pagination';

const teamSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  visibility: z.enum(['private', 'public', 'hiddenMembership']),
});

export type MicrosoftTeam = z.infer<typeof teamSchema>;

export type GetTeamsParams = {
  token: string;
  skipToken: string | null;
};

export const getTeams = async ({ token, skipToken }: GetTeamsParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/teams`);
  url.searchParams.append('$top', String(env.TEAMS_SYNC_BATCH_SIZE));
  url.searchParams.append('$select', 'id,visibility,displayName');

  if (skipToken) {
    url.searchParams.append('$skiptoken', skipToken);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve teams', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const validTeams: MicrosoftTeam[] = [];
  const invalidTeams: unknown[] = [];

  for (const team of data.value) {
    const result = teamSchema.safeParse(team);
    if (result.success) {
      validTeams.push(result.data);
    } else {
      invalidTeams.push(team);
    }
  }

  const nextSkipToken = getNextSkipTokenFromNextLink(data['@odata.nextLink']);

  return { nextSkipToken, validTeams, invalidTeams };
};

export const getTeam = async (encryptToken: string, teamId: string) => {
  const token = await decrypt(encryptToken);
  const url = new URL(`${env.MICROSOFT_API_URL}/teams/${teamId}`);
  url.searchParams.append('$select', 'id,visibility,displayName');

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve teams', { response });
  }

  const data = (await response.json()) as object;

  const result = teamSchema.safeParse(data);

  if (!result.success) {
    return null;
  }

  return result.data;
};
