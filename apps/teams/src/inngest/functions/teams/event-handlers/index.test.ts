import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test } from 'vitest';
import { handleTeamsWebhookEvent } from '@/inngest/functions/teams/handle-team-webhook-event';

const setup = createInngestFunctionMock(
  handleTeamsWebhookEvent,
  'teams/teams.webhook.event.received'
);

describe('teams-handle-teams-webhook-event', () => {
  test('should throw when event does not exist', async () => {
    const [result, { step }] = setup({
      payload: {
        // @ts-expect-error -- This is a unhandled event that doesn't exist
        event: 'unknown',
      },
    });

    await expect(result).rejects.toBeInstanceOf(TypeError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
