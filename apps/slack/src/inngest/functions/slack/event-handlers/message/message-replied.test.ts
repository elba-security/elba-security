import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { handleSlackWebhookEvent } from '../../handle-slack-webhook-event';
import type { SlackMessageSubtype } from './types';
import * as message from './message';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const eventType: SlackEvent['type'] = 'message';
const messageSubtype: SlackMessageSubtype = 'message_replied';

describe(`handle-slack-webhook-event ${eventType} ${messageSubtype}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should be handled successfully', async () => {
    const messageMock = vi.spyOn(message, 'genericMessageHandler');

    const [result, { step }] = setup({
      encrypted: {
        event: {
          type: eventType,
          subtype: messageSubtype,
          channel_type: 'channel',
          // @ts-expect-error -- This is a partial mock
          message: {
            team: 'team-id',
            channel: 'channel-id',
            ts: 'message-id',
            text: 'text',
            user: 'user-id',
          },
        },
      },
    });

    await expect(result).resolves.toBeTruthy();

    expect(messageMock).toBeCalledTimes(1);
    expect(messageMock).toBeCalledWith({
      channel: 'channel-id',
      team: 'team-id',
      text: 'text',
      ts: 'message-id',
      user: 'user-id',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
