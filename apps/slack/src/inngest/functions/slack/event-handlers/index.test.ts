import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

describe('handle-slack-webhook-event', () => {
  test('should be ignored if event is not handled', async () => {
    const [result, { step }] = setup({
      encrypted: {
        event: {
          // @ts-expect-error -- This is a unhandled event that doesn't exist
          type: 'unknown',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Ignored: unhandled slack event type',
      type: 'unknown',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
