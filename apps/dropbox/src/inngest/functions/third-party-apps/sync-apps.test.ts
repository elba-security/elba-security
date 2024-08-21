import { afterEach } from 'node:test';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import { organisationsTable, type Organisation } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import * as appsConnector from '@/connectors/dropbox/apps';
import { env } from '@/common/env';
import { createLinkedApps, createMockUserApps } from './__mocks__/member-linked-apps';
import { syncApps } from './sync-apps';

const now = new Date('2021-01-01T00:00:00.000Z').getTime();

const organisation: Omit<Organisation, 'createdAt'> = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  adminTeamMemberId: 'admin-team-member-id',
  rootNamespaceId: 'root-namespace-id',
  region: 'us',
};

const setup = createInngestFunctionMock(syncApps, 'dropbox/third_party_apps.sync.requested');

describe('syncApps', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  test('should abort sync when organisation is not found', async () => {
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: [],
      nextCursor: null,
    });

    const elba = spyOnElba();
    const [result, { step }] = setup({
      organisationId: '00000000-0000-0000-0000-000000000001',
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
    expect(appsConnector.getLinkedApps).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should call elba delete event if the members apps length is 0', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: [],
      nextCursor: null,
    });

    const [result] = setup({
      organisationId: '00000000-0000-0000-0000-000000000001',
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(0);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: new Date(now).toISOString(),
    });
  });

  test('should fetch members apps send it to elba(without pagination)', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(crypto, 'decrypt').mockResolvedValue('token');
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: createLinkedApps({
        length: 2,
        startFrom: 0,
      }).membersApps,
      nextCursor: null,
    });

    const [result] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
    });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: createMockUserApps,
    });
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledWith({
      syncedBefore: new Date(now).toISOString(),
    });
  });

  test('should fetch members apps and invoke next event to fetch the next page', async () => {
    await db.insert(organisationsTable).values(organisation);
    const elba = spyOnElba();
    vi.spyOn(appsConnector, 'getLinkedApps').mockResolvedValue({
      apps: createLinkedApps({
        length: 2,
        startFrom: 0,
      }).membersApps,
      nextCursor: 'next-cursor-1',
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      isFirstSync: false,
      syncStartedAt: now,
      cursor: null,
    });

    await expect(result).resolves.toEqual({
      status: 'ongoing',
    });

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });

    const elbaInstance = elba.mock.results[0]?.value;

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('list-next-page-apps', {
      name: 'dropbox/third_party_apps.sync.requested',
      data: {
        cursor: 'next-cursor-1',
        isFirstSync: false,
        organisationId: '00000000-0000-0000-0000-000000000001',
        syncStartedAt: 1609459200000,
      },
    });

    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledTimes(1);
    expect(elbaInstance?.thirdPartyApps.updateObjects).toBeCalledWith({
      apps: createMockUserApps,
    });
    expect(elbaInstance?.thirdPartyApps.deleteObjects).toBeCalledTimes(0);
  });
});
