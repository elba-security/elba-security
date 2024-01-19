import { expect, test, describe, vi, afterEach } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { teams } from '@/database/schema';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(handleSlackWebhookEvent, 'slack/webhook.handle');

const eventType: SlackEvent['type'] = 'user_change';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should update user successfully', async () => {
    const elba = spyOnElba();

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
        user: {
          team_id: 'team-id',
          id: 'user-id',
          is_bot: false,
          deleted: false,
          real_name: 'John Doe',
          // @ts-expect-error -- this is a partial mock
          profile: {
            email: 'user@domain.com',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'User updated',
      teamId: 'team-id',
      user: {
        deleted: false,
        id: 'user-id',
        is_bot: false,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id',
      },
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'John Doe',
          email: 'user@domain.com',
          id: 'user-id',
        },
      ],
    });
    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should delete user successfully', async () => {
    const elba = spyOnElba();

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
        user: {
          team_id: 'team-id',
          id: 'user-id',
          is_bot: false,
          deleted: true,
          real_name: 'John Doe',
          // @ts-expect-error -- this is a partial mock
          profile: {
            email: 'user@domain.com',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'User deleted',
      teamId: 'team-id',
      user: {
        deleted: true,
        id: 'user-id',
        is_bot: false,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id',
      },
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
      sourceId: '00000000-0000-0000-0000-000000000000',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(0);
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ ids: ['user-id'] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should ignored if user is a bot', async () => {
    const elba = spyOnElba();

    await db.insert(teams).values({
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      team_id: 'team-id',
      event: {
        type: eventType,
        user: {
          team_id: 'team-id',
          id: 'user-id',
          is_bot: true,
          deleted: true,
          real_name: 'John Doe',
          // @ts-expect-error -- this is a partial mock
          profile: {
            email: 'user@domain.com',
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'Ignored: invalid user',
      user: {
        deleted: true,
        id: 'user-id',
        is_bot: true,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id',
      },
    });

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
