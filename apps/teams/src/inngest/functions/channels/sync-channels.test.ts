import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { sql } from 'drizzle-orm';
import * as channelsConnector from '@/connectors/microsoft/channels/channels';
import { db } from '@/database/client';
import { channelsTable, organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { syncChannels } from '@/inngest/functions/channels/sync-channels';
import type { MicrosoftChannel } from '@/connectors/microsoft/channels/channels';

const token = 'token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

const setup = createInngestFunctionMock(syncChannels, 'teams/channels.sync.requested');

const data = {
  organisationId: organisation.id,
  teamId: 'team-id-1732',
};

const invalidChannels = [
  {
    membershipType: `sharing`,
    webUrl: `https://test.com`,
  },
];

function createValidChannelsArray() {
  const objectsArray: MicrosoftChannel[] = [];

  for (let i = 0; i < 3; i++) {
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

describe('sync-channels', () => {
  test('should abort sync when the organisation is not registered', async () => {
    const getTeams = vi.spyOn(channelsConnector, 'getChannels').mockResolvedValue({
      validChannels,
      invalidChannels,
    });
    const [result, { step }] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getTeams).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should finalize the sync when there is no next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getChannels = vi.spyOn(channelsConnector, 'getChannels').mockResolvedValue({
      invalidChannels,
      validChannels,
    });

    const channelsToInsert = validChannels.map((channel) => ({
      organisationId: organisation.id,
      id: `${organisation.id}:${channel.id}`,
      membershipType: channel.membershipType,
      displayName: channel.displayName,
      channelId: channel.id,
    }));

    await db
      .insert(channelsTable)
      .values(channelsToInsert)
      .onConflictDoUpdate({
        target: [channelsTable.id],
        set: {
          displayName: sql`excluded.display_name`,
        },
      });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(getChannels).toBeCalledTimes(1);
    expect(getChannels).toBeCalledWith({
      token,
      teamId: data.teamId,
    });

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('wait-for-messages-complete-channel-id-0', {
      event: 'teams/messages.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.channelId == 'channel-id-0'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-messages-complete-channel-id-1', {
      event: 'teams/messages.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.channelId == 'channel-id-1'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-messages-complete-channel-id-2', {
      event: 'teams/messages.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.channelId == 'channel-id-2'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(3);
    expect(step.sendEvent).toBeCalledWith('start-messages-sync', [
      {
        data: {
          teamId: data.teamId,
          organisationId: organisation.id,
          channelId: 'channel-id-0',
          channelName: 'name-0',
          membershipType: `shared`,
        },
        name: 'teams/messages.sync.requested',
      },
      {
        data: {
          teamId: data.teamId,
          organisationId: organisation.id,
          channelId: 'channel-id-1',
          channelName: 'name-1',
          membershipType: `shared`,
        },
        name: 'teams/messages.sync.requested',
      },
      {
        data: {
          teamId: data.teamId,
          organisationId: organisation.id,
          channelId: 'channel-id-2',
          channelName: 'name-2',
          membershipType: `shared`,
        },
        name: 'teams/messages.sync.requested',
      },
    ]);
    expect(step.sendEvent).toBeCalledWith('channels-sync-complete', {
      name: 'teams/channels.sync.completed',
      data: {
        teamId: data.teamId,
        organisationId: organisation.id,
      },
    });
  });
});
