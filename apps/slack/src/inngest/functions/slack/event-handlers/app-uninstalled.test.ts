import { expect, test, describe, afterEach, vi } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'app_uninstalled';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should successfully delete team and update elba connection status', async () => {
    const elba = spyOnElba();

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
    // @ts-expect-error -- this is a mock
    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'App uninstalled',
      teamId: 'team-id',
      team: {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
      },
    });

    const teamsInserted = await db.query.teams.findMany();

    expect(teamsInserted).toEqual([
      {
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'another-team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
