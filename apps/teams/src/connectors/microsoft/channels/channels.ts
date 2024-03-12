import { z } from 'zod';
import { env } from '@/env';
import { MicrosoftError } from '../commons/error';
import { type MicrosoftPaginatedResponse } from '../commons/pagination';

const channelSchema = z.object({
  id: z.string(),
  membershipType: z.enum(['standard', 'private', 'unknownFutureValue', 'shared']),
  webUrl: z.string().url(),
  displayName: z.string(),
});

export type MicrosoftChannel = z.infer<typeof channelSchema>;

export type GetChannelsParams = {
  token: string;
  teamId: string;
};

export const getChannels = async ({ token, teamId }: GetChannelsParams) => {
  const url = new URL(`${env.MICROSOFT_API_URL}/teams/${teamId}/channels`);
  url.searchParams.append('$select', 'id,membershipType,webUrl,displayName');
  url.searchParams.append('$filter', "membershipType eq 'shared' or membershipType eq 'standard'");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'include-unknown-enum-members',
    },
  });

  if (!response.ok) {
    throw new MicrosoftError('Could not retrieve channel', { response });
  }

  const data = (await response.json()) as MicrosoftPaginatedResponse<unknown>;

  const validChannels: MicrosoftChannel[] = [];
  const invalidChannels: unknown[] = [];

  for (const channel of data.value) {
    const result = channelSchema.safeParse(channel);
    if (result.success) {
      validChannels.push(result.data);
    } else {
      invalidChannels.push(channel);
    }
  }

  return { validChannels, invalidChannels };
};
