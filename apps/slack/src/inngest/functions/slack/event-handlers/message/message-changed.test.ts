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
const messageSubtype: SlackMessageSubtype = 'message_changed';

describe(`handle-slack-webhook-event ${eventType} ${messageSubtype}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  test('should be ignored if message subtype is not handled', async () => {
    const messageMock = vi.spyOn(message, 'genericMessageHandler');

    const [result, { step }] = setup({
      encrypted: {
        event: {
          type: eventType,
          subtype: messageSubtype,
          channel_type: 'channel',
          // @ts-expect-error -- This is a partial mock
          message: {
            subtype: 'bot_message',
          },
          // @ts-expect-error -- This is a partial mock
          previous_message: {
            subtype: 'bot_message',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Ignored: unhandled message changed subtype',
      previousSubtype: 'bot_message',
      subtype: 'bot_message',
    });

    expect(messageMock).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test("should be ignored if message content disn't change", async () => {
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
            text: 'some text',
          },
          // @ts-expect-error -- This is a partial mock
          previous_message: {
            text: 'some text',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelId: 'channel-id',
      message: "Ignored: message content hasn't changed",
      messageId: 'message-id',
      teamId: 'team-id',
    });

    expect(messageMock).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
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
          // @ts-expect-error -- This is a partial mock
          previous_message: {
            text: 'some text',
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
