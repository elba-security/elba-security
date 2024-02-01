import { expect, test, describe, vi, afterEach, beforeAll, afterAll } from 'vitest';
import type { SlackEvent } from '@slack/bolt';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as slack from 'slack-web-api-client';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import * as crypto from '@/common/crypto';
import { handleSlackWebhookEvent } from '../handle-slack-webhook-event';

const setup = createInngestFunctionMock(
  handleSlackWebhookEvent,
  'slack/slack.webhook.event.received'
);

const eventType: SlackEvent['type'] = 'user_change';

describe(`handle-slack-webhook-event ${eventType}`, () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
  });

  afterAll(() => {
    vi.resetModules();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should update user successfully', async () => {
    const elba = spyOnElba();

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
    });

    vi.spyOn(crypto, 'decrypt').mockImplementation((token) =>
      Promise.resolve(`decrypted-${token}`)
    );

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

    expect(crypto.decrypt).toBeCalledTimes(0);

    expect(slack.SlackAPIClient).toBeCalledTimes(0);
    expect(authRevokeMock).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([
      {
        adminId: 'admin-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(0);
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

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
    });

    vi.spyOn(crypto, 'decrypt').mockImplementation((token) =>
      Promise.resolve(`decrypted-${token}`)
    );

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

    expect(crypto.decrypt).toBeCalledTimes(0);

    expect(slack.SlackAPIClient).toBeCalledTimes(0);
    expect(authRevokeMock).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([
      {
        adminId: 'admin-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(0);
    expect(elbaInstance?.users.update).toBeCalledTimes(0);
    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({ ids: ['user-id'] });

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should ignored if user is a bot', async () => {
    const elba = spyOnElba();

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
    });

    vi.spyOn(crypto, 'decrypt').mockImplementation((token) =>
      Promise.resolve(`decrypted-${token}`)
    );

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

    expect(crypto.decrypt).toBeCalledTimes(0);

    expect(slack.SlackAPIClient).toBeCalledTimes(0);
    expect(authRevokeMock).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([
      {
        adminId: 'admin-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'token',
        url: 'https://url',
      },
    ]);

    expect(elba).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should uninstall the app when user is not admin anymore', async () => {
    const elba = spyOnElba();

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
    });

    vi.spyOn(crypto, 'decrypt').mockImplementation((token) =>
      Promise.resolve(`decrypted-${token}`)
    );

    await db.insert(teamsTable).values([
      {
        adminId: 'admin-id-1',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id-1',
        token: 'token-1',
        url: 'https://url',
      },
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'team-id-2',
        token: 'token-2',
        url: 'https://url',
      },
    ]);

    const [result, { step }] = setup({
      encrypted: {
        team_id: 'team-id-1',
        event: {
          type: eventType,
          user: {
            team_id: 'team-id-1',
            id: 'admin-id-1',
            is_bot: false,
            is_admin: false,
            deleted: true,
            real_name: 'John Doe',
            // @ts-expect-error -- this is a partial mock
            profile: {
              email: 'user@domain.com',
            },
          },
        },
      },
    });

    await expect(result).resolves.toStrictEqual({
      message: 'App uninstalled, user is not admin anymore',
      teamId: 'team-id-1',
      user: {
        deleted: true,
        id: 'admin-id-1',
        is_admin: false,
        is_bot: false,
        profile: {
          email: 'user@domain.com',
        },
        real_name: 'John Doe',
        team_id: 'team-id-1',
      },
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token-1');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith();

    expect(authRevokeMock).toBeCalledTimes(1);
    expect(authRevokeMock).toBeCalledWith({ token: 'decrypted-token-1' });

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([
      {
        adminId: 'admin-id-2',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000002',
        elbaRegion: 'eu',
        id: 'team-id-2',
        token: 'token-2',
        url: 'https://url',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({ hasError: true });
    expect(elbaInstance?.users.update).toBeCalledTimes(0);
    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
