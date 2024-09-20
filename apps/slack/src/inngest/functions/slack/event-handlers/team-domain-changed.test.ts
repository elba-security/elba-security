import { expect, test, describe, beforeAll, afterAll, vi } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const mockedDate = '2023-01-01T00:00:00.000Z';

const eventType: SlackEvent['type'] = 'team_domain_changed';

describe.skip(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should update team successfully', async () => {
    await db.insert(teamsTable).values([
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
      {
        // Shouldn't be updated as it doesn't match the same id
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'another-team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    const [result, { step }] = setup({
      // @ts-expect-error -- this is a partial mock
      encrypted: {
        team_id: 'team-id',
        event: {
          type: eventType,
          domain: 'new-domain',
          url: 'https://new-domain.slack.com',
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Team domain changed',
      teamId: 'team-id',
      url: 'https://new-domain.slack.com',
    });

    const teamsInserted = await db.query.teamsTable.findMany();

    expect(teamsInserted).toEqual([
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'another-team-id',
        token: 'token',
        url: 'https://url',
      },
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://new-domain.slack.com',
      },
    ]);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('synchronize-conversations', {
      data: {
        isFirstSync: false,
        syncStartedAt: mockedDate,
        teamId: 'team-id',
      },
      name: 'slack/conversations.sync.requested',
    });
  });
});
