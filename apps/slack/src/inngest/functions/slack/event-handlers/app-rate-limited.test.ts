import { expect, test, describe } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'app_rate_limited';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  test('should successfully log team that is rate limited', async () => {
    await db.insert(teams).values([
      {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
      {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'another-team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);
    const [result, { step }] = setup({
      team_id: 'team-id',
      // @ts-expect-error -- this is a mock
      event: {
        type: eventType,
        minute_rate_limited: 1518467820,
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'App rate limited',
      minuteRateLimited: 1518467820,
      teamId: 'team-id',
      team: {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
      },
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
