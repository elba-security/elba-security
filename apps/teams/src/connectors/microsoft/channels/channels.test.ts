/* eslint-disable @typescript-eslint/no-unsafe-call -- test conveniency */
/* eslint-disable @typescript-eslint/no-unsafe-return -- test conveniency */

import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { env } from '@/env';
import type { MicrosoftChannel } from '@/connectors/microsoft/channels/channels';
import { getChannels } from '@/connectors/microsoft/channels/channels';
import { server } from '../../../../vitest/setup-msw-handlers';
import { MicrosoftError } from '../commons/error';

const validToken = 'token-1234';

const teamId = 'some-team-id';

const invalidChannels = [
  {
    membershipType: `sharing`,
    webUrl: `https://test.com`,
  },
];

function createValidChannelsArray() {
  const objectsArray: MicrosoftChannel[] = [];

  for (let i = 0; i < Number(env.CHANNEL_SYNC_BATCH_SIZE) - invalidChannels.length; i++) {
    const obj: MicrosoftChannel = {
      id: `channel-id-${i}`,
      membershipType: `shared`,
      webUrl: `https://test.com-${i}`,
      displayName: `name-${i}`,
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validChannels: MicrosoftChannel[] = createValidChannelsArray();

const channels = [...validChannels, ...invalidChannels];

describe('getChannels', () => {
  beforeEach(() => {
    server.use(
      http.get(`${env.MICROSOFT_API_URL}/teams/:teamId/channels`, ({ request, params }) => {
        if (
          request.headers.get('Authorization') !== `Bearer ${validToken}` ||
          params.teamId !== teamId
        ) {
          return new Response(undefined, { status: 401 });
        }
        const url = new URL(request.url);
        const select = url.searchParams.get('$select');
        const filter = url.searchParams.get('$filter');

        const selectedKeys = select?.split(',') || ([] as unknown as (keyof MicrosoftChannel)[]);
        const formatedChannels = channels.map((user) =>
          selectedKeys.reduce<Partial<MicrosoftChannel>>((acc, key: keyof MicrosoftChannel) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- convenience
            acc[key] = user[key];
            return acc;
          }, {})
        );

        const filterChannels = filter?.length
          ? formatedChannels.filter((channel) => channel.membershipType !== 'private')
          : [];

        return Response.json({
          value: filterChannels,
        });
      })
    );
  });

  test('should return channels when the token is valid ', async () => {
    await expect(getChannels({ teamId, token: validToken })).resolves.toStrictEqual({
      validChannels,
      invalidChannels,
    });
  });

  test('should throws when the token is invalid', async () => {
    await expect(getChannels({ teamId, token: 'invalid-token' })).rejects.toBeInstanceOf(
      MicrosoftError
    );
  });

  test('should throws when the teamId is invalid', async () => {
    await expect(
      getChannels({ teamId: 'invalid-team-id', token: validToken })
    ).rejects.toBeInstanceOf(MicrosoftError);
  });
});
