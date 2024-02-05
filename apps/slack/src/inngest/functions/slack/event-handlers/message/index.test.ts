import { expect, test, describe } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { handleSlackWebhookEvent } from '../../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const eventType: SlackEvent['type'] = 'message';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  test('should be ignored if event is not handled', async () => {
    const [result, { step }] = setup({
      encrypted: {
        event: {
          type: eventType,
          // @ts-expect-error -- This is a unhandled message event subtype that doesn't exist
          subtype: 'unknown',
          channel_type: 'channel',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Ignored: unhandled message subtype',
      subtype: 'unknown',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should be ignored if channel type is not channel', async () => {
    const [result, { step }] = setup({
      encrypted: {
        // @ts-expect-error -- This is a unhandled message event subtype that doesn't exist
        event: {
          type: eventType,
          channel_type: 'group',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      channelType: 'group',
      message: 'Ignored: unhandled channel type',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
