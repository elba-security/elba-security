import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { describe, expect, test, vi } from 'vitest';
import { NonRetriableError } from 'inngest';
import { syncTeams } from '@/inngest/functions/channels/sync-teams';
import type { MicrosoftTeam } from '@/connectors/microsoft/teams/teams';
import * as teamConnector from '@/connectors/microsoft/teams/teams';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';

const token = 'token';
const startSkipToken = 'start-skip-token';
const nextSkipToken = 'next-skip-token';
const encryptedToken = await encrypt(token);

const organisation = {
  id: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
  tenantId: 'tenantId',
  region: 'us',
  token: encryptedToken,
};

const setup = createInngestFunctionMock(syncTeams, 'teams/teams.sync.requested');

const data = {
  organisationId: organisation.id,
  skipToken: startSkipToken,
  syncStartedAt: '2024-03-13T11:29:15.185Z',
  isFirstSync: true,
};

const validTeams: MicrosoftTeam[] = [
  { id: 'team-id-1', visibility: 'public', displayName: 'name-1' },
  { id: 'team-id-2', visibility: 'public', displayName: 'name-2' },
  { id: 'team-id-3', visibility: 'private', displayName: 'name-3' },
];

const invalidTeams = [
  { id: 'team-id-2', visibility: 'public', status: 'private' },
  { id: 'team-id-1', visibility: 'public', status: 'private' },
];

describe('sync-teams', () => {
  test('should abort sync when the organisation is not registered', async () => {
    const getTeams = vi.spyOn(teamConnector, 'getTeams').mockResolvedValue({
      nextSkipToken,
      validTeams,
      invalidTeams,
    });
    const [result, { step }] = setup(data);

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getTeams).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should continue the sync when there is a next page', async () => {
    await db.insert(organisationsTable).values(organisation);

    const getTeams = vi.spyOn(teamConnector, 'getTeams').mockResolvedValue({
      nextSkipToken,
      validTeams,
      invalidTeams,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });

    expect(getTeams).toBeCalledTimes(1);
    expect(getTeams).toBeCalledWith({
      skipToken: data.skipToken,
      token,
    });

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-1', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-1'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-2', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-2'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-3', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-3'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(2);
    expect(step.sendEvent).toBeCalledWith('start-channels-sync', [
      {
        data: {
          teamId: 'team-id-1',
          teamName: 'name-1',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.requested',
      },
      {
        data: {
          teamId: 'team-id-2',
          teamName: 'name-2',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.requested',
      },
      {
        data: {
          teamId: 'team-id-3',
          teamName: 'name-3',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.requested',
      },
    ]);

    expect(step.sendEvent).toBeCalledWith('sync-next-teams-page', {
      name: 'teams/teams.sync.requested',
      data: { ...data, skipToken: nextSkipToken },
    });
  });

  test('should finalize the sync when there is no next page', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values(organisation);

    const getTeams = vi.spyOn(teamConnector, 'getTeams').mockResolvedValue({
      nextSkipToken: null,
      validTeams,
      invalidTeams,
    });

    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(getTeams).toBeCalledTimes(1);
    expect(getTeams).toBeCalledWith({
      token,
      skipToken: data.skipToken,
    });

    expect(step.waitForEvent).toBeCalledTimes(3);
    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-1', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-1'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-2', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-2'`,
      timeout: '1d',
    });

    expect(step.waitForEvent).toBeCalledWith('wait-for-channels-complete-team-id-3', {
      event: 'teams/channels.sync.completed',
      if: `async.data.organisationId == '${organisation.id}' && async.data.teamId == 'team-id-3'`,
      timeout: '1d',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('start-channels-sync', [
      {
        data: {
          teamId: 'team-id-1',
          teamName: 'name-1',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.requested',
      },
      {
        data: {
          teamId: 'team-id-2',
          teamName: 'name-2',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.requested',
      },
      {
        data: {
          teamId: 'team-id-3',
          teamName: 'name-3',
          organisationId: organisation.id,
        },
        name: 'teams/channels.sync.requested',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
  });
});
