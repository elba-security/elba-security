import { http } from 'msw';
import { describe, expect, test, beforeEach } from 'vitest';
import { server } from '@elba-security/test-utils';
import { env } from '@/env';
import type { MicrosoftChannel } from '@/connectors/microsoft/channels/channels';
import { getChannel, getChannels } from '@/connectors/microsoft/channels/channels';
import { MicrosoftError } from '../commons/error';

const validToken = 'token-1234';
const invalidDataToken = 'invalid-data-token';

const teamId = 'some-team-id';

const channelId = 'some-channel-id';

const invalidChannels = [
  {
    membershipType: `sharing`,
    webUrl: `https://test.com`,
  },
];

function createValidChannelsArray() {
  const objectsArray: MicrosoftChannel[] = [];

  for (let i = 0; i < 1 - invalidChannels.length; i++) {
    const obj: MicrosoftChannel = {
      id: `channel-id-${i}`,
      membershipType: `shared`,
      webUrl: `https://web-url-${i}.com`,
      displayName: `name-${i}`,
    };
    objectsArray.push(obj);
  }

  return objectsArray;
}

const validChannels: MicrosoftChannel[] = createValidChannelsArray();

const channelResponse: MicrosoftChannel = {
  id: 'channel-id',
  membershipType: 'shared',
  displayName: 'name',
  webUrl: 'https://web-url.com',
};

const channels = [...validChannels, ...invalidChannels];

describe('channels connector', () => {
  describe('getChannels', () => {
    beforeEach(() => {
      server.use(
        http.get(`${env.MICROSOFT_API_URL}/teams/:teamId/channels`, ({ request, params }) => {
          if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
            return new Response(undefined, { status: 401 });
          }

          if (params.teamId !== teamId) {
            return new Response(undefined, { status: 400 });
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

          return new Response(
            JSON.stringify({
              value: filterChannels,
            })
          );
        })
      );
    });

    test('should return channels when the token is valid ', async () => {
      await expect(getChannels({ teamId, token: validToken })).resolves.toStrictEqual({
        validChannels,
        invalidChannels,
      });
    });

    test('should throw when the token is invalid', async () => {
      await expect(getChannels({ teamId, token: 'invalid-token' })).rejects.toBeInstanceOf(
        MicrosoftError
      );
    });

    test('should throw when the teamId is invalid', async () => {
      await expect(
        getChannels({ teamId: 'invalid-team-id', token: validToken })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });

  describe('getChannel', () => {
    beforeEach(() => {
      server.use(
        http.get(
          `${env.MICROSOFT_API_URL}/teams/:teamId/channels/:channelId`,
          ({ request, params }) => {
            if (request.headers.get('Authorization') === `Bearer ${invalidDataToken}`) {
              return new Response(JSON.stringify(null));
            }

            if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
              return new Response(undefined, { status: 401 });
            }

            if (params.teamId !== teamId || params.channelId !== channelId) {
              return new Response(undefined, { status: 400 });
            }

            const url = new URL(request.url);
            const select = url.searchParams.get('$select');

            const selectedKeys =
              select?.split(',') || ([] as unknown as (keyof MicrosoftChannel)[]);

            const validChannel = {} as MicrosoftChannel;

            for (const key in channelResponse) {
              if (selectedKeys.includes(key)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- here we select fields for our channel object
                validChannel[key] = channelResponse[key];
              }
            }

            return new Response(JSON.stringify(validChannel));
          }
        )
      );
    });

    test('should return the channel when the token is valid and the teamId and channelId is valid too', async () => {
      await expect(getChannel({ teamId, channelId, token: validToken })).resolves.toStrictEqual(
        channelResponse
      );
    });

    test('should exit if the data of the channel is invalid', async () => {
      await expect(getChannel({ teamId, channelId, token: invalidDataToken })).resolves.toBeNull();
    });

    test('should throw when the token is invalid', async () => {
      await expect(
        getChannel({ teamId, channelId, token: 'invalid-token' })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });

    test('should throw when teamId or channelId is invalid and the token is valid', async () => {
      await expect(
        getChannel({
          teamId: 'invalid-team-id',
          channelId: 'invalid-channel-id',
          token: validToken,
        })
      ).rejects.toBeInstanceOf(MicrosoftError);
    });
  });
});
