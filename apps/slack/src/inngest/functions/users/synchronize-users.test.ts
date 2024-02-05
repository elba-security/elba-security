import { expect, test, describe, vi, afterEach, afterAll, beforeAll } from 'vitest';
import * as slack from 'slack-web-api-client';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import { teamsTable } from '@/database/schema';
import { synchronizeUsers } from './synchronize-users';

const setup = createInngestFunctionMock(synchronizeUsers, 'slack/users.sync.requested');

describe('synchronize-users', () => {
  beforeAll(() => {
    vi.mock('slack-web-api-client');
    vi.mock('@/common/crypto');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.resetModules();
  });

  test('should synchronize users successfully and handle pagination', async () => {
    const elba = spyOnElba();

    const usersListMock = vi.fn().mockResolvedValue({
      ok: true,
      members: [
        {
          id: '1',
          real_name: 'test',
          profile: {
            email: 'test@test.test',
          },
          team_id: 'team-id',
        },
      ],
      headers: new Headers(),
      response_metadata: {
        next_cursor: 'next-cursor',
      },
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.list>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      users: {
        list: usersListMock,
      },
    });

    await db.insert(teamsTable).values({
      adminId: 'admin-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      isFirstSync: true,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
      teamId: 'team-id',
    });

    await expect(result).resolves.toStrictEqual({
      users: [
        {
          additionalEmails: [],
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
      nextCursor: 'next-cursor',
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(usersListMock).toBeCalledTimes(1);
    expect(usersListMock).toBeCalledWith({ limit: 200 });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
    });
    expect(elbaInstance?.users.delete).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-pagination-cursor', {
      data: {
        cursor: 'next-cursor',
        isFirstSync: true,
        syncStartedAt: '2023-01-01T00:00:00.000Z',
        teamId: 'team-id',
      },
      name: 'slack/users.sync.requested',
    });
  });

  test('should synchronize users successfully and end when pagination is over', async () => {
    const elba = spyOnElba();

    const usersListMock = vi.fn().mockResolvedValue({
      ok: true,
      members: [
        {
          id: '1',
          real_name: 'test',
          profile: {
            email: 'test@test.test',
          },
          team_id: 'team-id',
        },
      ],
      headers: new Headers(),
    } satisfies Awaited<ReturnType<typeof slack.SlackAPIClient.prototype.users.list>>);

    vi.spyOn(crypto, 'decrypt').mockResolvedValue('decrypted-token');

    vi.spyOn(slack, 'SlackAPIClient').mockReturnValue({
      // @ts-expect-error -- this is a mock
      users: {
        list: usersListMock,
      },
    });

    await db.insert(teamsTable).values({
      adminId: 'admin-id',
      elbaOrganisationId: '00000000-0000-0000-0000-000000000001',
      elbaRegion: 'eu',
      id: 'team-id',
      token: 'token',
      url: 'https://url',
    });

    const [result, { step }] = setup({
      isFirstSync: false,
      syncStartedAt: '2023-01-01T00:00:00.000Z',
      teamId: 'team-id',
      cursor: 'cursor',
    });

    await expect(result).resolves.toStrictEqual({
      users: [
        {
          additionalEmails: [],
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
      nextCursor: undefined,
    });

    expect(crypto.decrypt).toBeCalledTimes(1);
    expect(crypto.decrypt).toBeCalledWith('token');

    expect(slack.SlackAPIClient).toBeCalledTimes(1);
    expect(slack.SlackAPIClient).toBeCalledWith('decrypted-token');

    expect(usersListMock).toBeCalledTimes(1);
    expect(usersListMock).toBeCalledWith({ cursor: 'cursor', limit: 200 });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: 'elba-api-key',
      organisationId: '00000000-0000-0000-0000-000000000001',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.users.update).toBeCalledTimes(1);
    expect(elbaInstance?.users.update).toBeCalledWith({
      users: [
        {
          additionalEmails: [],
          displayName: 'test',
          email: 'test@test.test',
          id: '1',
        },
      ],
    });

    expect(elbaInstance?.users.delete).toBeCalledTimes(1);
    expect(elbaInstance?.users.delete).toBeCalledWith({
      syncedBefore: '2023-01-01T00:00:00.000Z',
    });

    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
