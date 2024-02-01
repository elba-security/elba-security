import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { handleSlackWebhookEvent } from '../../handle-slack-webhook-event';
import type { SlackMessageSubtype } from './types';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const eventType: SlackEvent['type'] = 'message';
const messageSubtype: SlackMessageSubtype = 'message_deleted';

describe(`handle-slack-webhook-event ${eventType} ${messageSubtype}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should delete message successfully', async () => {
    const elba = spyOnElba();

    await db.insert(teamsTable).values({
      adminId: 'admin-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id',
        // @ts-expect-error -- This is a partial mock
        event: {
          type: eventType,
          subtype: messageSubtype,
          channel_type: 'channel',
          deleted_ts: 'message-id',
          channel: 'channel-id',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      conversationId: 'channel-id',
      message: 'Message deleted',
      messageId: 'message-id',
      teamId: 'team-id',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      ids: ['["team-id","channel-id","message-id"]'],
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
