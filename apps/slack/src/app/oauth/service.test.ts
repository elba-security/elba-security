import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as slack from 'slack-web-api-client';
import * as crypto from '@/common/crypto';
import { slackUserScopes } from '@/connectors/slack/oauth';
import { inngest } from '@/inngest/client';
import { db } from '@/database/client';
import { handleSlackInstallation } from './service';

const mockedDate = '2023-01-01T00:00:00.000Z';

describe('handleSlackInstallation', () => {
  beforeAll(() => {
    vi.setSystemTime(mockedDate);
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
  });

  afterAll(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Should successfully handle slack installation', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    const accessMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      is_enterprise_install: false,
      authed_user: {
        id: 'user-id',
        access_token: 'access-token',
        token_type: 'user',
        scope: slackUserScopes.join(','),
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.oauth.v2.access>>);

    const teamInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      team: {
        id: 'team-id',
        name: 'team',
        url: 'https://url',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.team.info>>);

    const usersInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      user: {
        is_admin: true,
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.info>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
      oauth: {
        // @ts-expect-error -- this is a mock
        v2: {
          access: accessMock,
        },
      },
      // @ts-expect-error -- this is a mock
      team: {
        info: teamInfoMock,
      },
      // @ts-expect-error -- this is a mock
      users: {
        info: usersInfoMock,
      },
    });

    await handleSlackInstallation({
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
      code: 'code',
    });

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith();

    expect(accessMock).toBeCalledTimes(1);
    expect(accessMock).toBeCalledWith({
      client_id: 'slack-client-id',
      client_secret: 'slack-client-secret',
      code: 'code',
    });

    expect(usersInfoMock).toBeCalledTimes(1);
    expect(usersInfoMock).toBeCalledWith({
      token: 'access-token',
      user: 'user-id',
    });

    expect(teamInfoMock).toBeCalledTimes(1);
    expect(teamInfoMock).toBeCalledWith({ token: 'access-token' });

    expect(authRevokeMock).toBeCalledTimes(0);

    expect(crypto.encrypt).toBeCalledTimes(1);
    expect(crypto.encrypt).toBeCalledWith('access-token');

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([
      {
        adminId: 'user-id',
        elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
        elbaRegion: 'eu',
        id: 'team-id',
        token: 'encrypted-token',
        url: 'https://url',
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      data: {
        isFirstSync: true,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
        teamId: 'team-id',
      },
      name: 'slack/users.sync.requested',
    });
  });

  it('Should fail when the token type is not user', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    const accessMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      is_enterprise_install: false,
      authed_user: {
        access_token: 'access-token',
        token_type: 'bot',
        scope: slackUserScopes.join(','),
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.oauth.v2.access>>);

    const teamInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      team: {
        id: 'team-id',
        name: 'team',
        url: 'https://url',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.team.info>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
      oauth: {
        // @ts-expect-error -- this is a mock
        v2: {
          access: accessMock,
        },
      },
      // @ts-expect-error -- this is a mock
      team: {
        info: teamInfoMock,
      },
    });

    await expect(() =>
      handleSlackInstallation({
        organisationId: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
        code: 'code',
      })
    ).rejects.toThrowError('Unsupported token type');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith();

    expect(accessMock).toBeCalledTimes(1);
    expect(accessMock).toBeCalledWith({
      client_id: 'slack-client-id',
      client_secret: 'slack-client-secret',
      code: 'code',
    });

    expect(teamInfoMock).toBeCalledTimes(0);

    expect(authRevokeMock).toBeCalledTimes(1);
    expect(authRevokeMock).toBeCalledWith({
      token: 'access-token',
    });

    expect(crypto.encrypt).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([]);

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail when there are missing scopes', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    const accessMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      is_enterprise_install: false,
      authed_user: {
        id: 'user-id',
        access_token: 'access-token',
        token_type: 'user',
        scope: 'team:read',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.oauth.v2.access>>);

    const teamInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      team: {
        id: 'team-id',
        name: 'team',
        url: 'https://url',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.team.info>>);

    const usersInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      user: {
        is_admin: true,
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.info>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
      oauth: {
        // @ts-expect-error -- this is a mock
        v2: {
          access: accessMock,
        },
      },
      // @ts-expect-error -- this is a mock
      team: {
        info: teamInfoMock,
      },
      // @ts-expect-error -- this is a mock
      users: {
        info: usersInfoMock,
      },
    });

    await expect(() =>
      handleSlackInstallation({
        organisationId: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
        code: 'code',
      })
    ).rejects.toThrowError('Missing OAuth scopes');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith();

    expect(accessMock).toBeCalledTimes(1);
    expect(accessMock).toBeCalledWith({
      client_id: 'slack-client-id',
      client_secret: 'slack-client-secret',
      code: 'code',
    });

    expect(usersInfoMock).toBeCalledTimes(0);
    expect(teamInfoMock).toBeCalledTimes(0);

    expect(authRevokeMock).toBeCalledTimes(1);
    expect(authRevokeMock).toBeCalledWith({
      token: 'access-token',
    });

    expect(crypto.encrypt).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([]);

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail for enterprise install', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    const accessMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      is_enterprise_install: true,
      authed_user: {
        id: 'user-id',
        access_token: 'access-token',
        token_type: 'user',
        scope: slackUserScopes.join(','),
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.oauth.v2.access>>);

    const teamInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      team: {
        id: 'team-id',
        name: 'team',
        url: 'https://url',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.team.info>>);

    const usersInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      user: {
        is_admin: true,
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.info>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
      oauth: {
        // @ts-expect-error -- this is a mock
        v2: {
          access: accessMock,
        },
      },
      // @ts-expect-error -- this is a mock
      team: {
        info: teamInfoMock,
      },
      // @ts-expect-error -- this is a mock
      users: {
        info: usersInfoMock,
      },
    });

    await expect(() =>
      handleSlackInstallation({
        organisationId: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
        code: 'code',
      })
    ).rejects.toThrowError('Slack enterprise is not supported');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith();

    expect(accessMock).toBeCalledTimes(1);
    expect(accessMock).toBeCalledWith({
      client_id: 'slack-client-id',
      client_secret: 'slack-client-secret',
      code: 'code',
    });

    expect(usersInfoMock).toBeCalledTimes(0);
    expect(teamInfoMock).toBeCalledTimes(0);

    expect(authRevokeMock).toBeCalledTimes(1);
    expect(authRevokeMock).toBeCalledWith({
      token: 'access-token',
    });

    expect(crypto.encrypt).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([]);

    expect(send).toBeCalledTimes(0);
  });

  it('Should fail when user is not admin', async () => {
    const send = vi.spyOn(inngest, 'send').mockResolvedValue({ ids: [] });

    vi.spyOn(crypto, 'encrypt').mockResolvedValue('encrypted-token');

    const authRevokeMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.auth.revoke>>);

    const accessMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      is_enterprise_install: false,
      authed_user: {
        id: 'user-id',
        access_token: 'access-token',
        token_type: 'user',
        scope: slackUserScopes.join(','),
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.oauth.v2.access>>);

    const teamInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      team: {
        id: 'team-id',
        name: 'team',
        url: 'https://url',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.team.info>>);

    const usersInfoMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers(),
      user: {
        is_admin: false,
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.info>>);

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      auth: {
        revoke: authRevokeMock,
      },
      oauth: {
        // @ts-expect-error -- this is a mock
        v2: {
          access: accessMock,
        },
      },
      // @ts-expect-error -- this is a mock
      team: {
        info: teamInfoMock,
      },
      // @ts-expect-error -- this is a mock
      users: {
        info: usersInfoMock,
      },
    });

    await expect(() =>
      handleSlackInstallation({
        organisationId: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
        code: 'code',
      })
    ).rejects.toThrowError('User is not admin');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith();

    expect(accessMock).toBeCalledTimes(1);
    expect(accessMock).toBeCalledWith({
      client_id: 'slack-client-id',
      client_secret: 'slack-client-secret',
      code: 'code',
    });

    expect(usersInfoMock).toBeCalledTimes(1);
    expect(usersInfoMock).toBeCalledWith({
      token: 'access-token',
      user: 'user-id',
    });

    expect(teamInfoMock).toBeCalledTimes(0);

    expect(authRevokeMock).toBeCalledTimes(1);
    expect(authRevokeMock).toBeCalledWith({
      token: 'access-token',
    });

    expect(crypto.encrypt).toBeCalledTimes(0);

    const teamsInserted = await db.query.teamsTable.findMany();
    expect(teamsInserted).toEqual([]);

    expect(send).toBeCalledTimes(0);
  });
});
