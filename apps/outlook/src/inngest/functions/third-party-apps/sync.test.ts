import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import * as microsoftUsers from '@/connectors/microsoft/user';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env/server';
import { type MicrosoftUser } from '@/connectors/microsoft/types';
import * as authConnector from '@/connectors/microsoft/auth';
import { syncThirdPartyApps, type SyncThirdPartyAppsRequested } from './sync';

const mockFunction = createInngestFunctionMock(
  syncThirdPartyApps,
  'outlook/third_party_apps.sync.requested'
);

const region = 'eu';
const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';
const tenantId = 'tenant-id';
const token = 'token';
const syncStartedAt = '2025-06-02T13:32:08.000Z';
const lastSyncStartedAt = '2025-06-01T13:32:08.000Z';

vi.mock('@/common/crypto', () => ({
  decrypt: vi.fn(() => token),
}));

const invalidUsers = [
  {
    mail: `user-invalid@foo.bar`,
    userPrincipalName: `user-invalid`,
    displayName: `user invalid`,
  },
];

const validUsers: MicrosoftUser[] = Array.from(
  { length: Number(env.USERS_SYNC_BATCH_SIZE) - invalidUsers.length },
  (_, i) => ({
    id: `user-id-${i}`,
    mail: `user-${i}@foo.bar`,
    userPrincipalName: `user-${i}`,
    displayName: `user ${i}`,
    userType: `user-${i}`,
  })
);

const eventData: SyncThirdPartyAppsRequested['outlook/third_party_apps.sync.requested']['data'] = {
  organisationId,
  region,
  pageToken: null,
  tenantId,
  lastSyncStartedAt,
  syncStartedAt,
};

const setup = async ({
  data,
  users = validUsers,
  nextPageToken = null,
}: {
  data: Parameters<typeof mockFunction>[0];
  nextPageToken?: string | null;
  users?: MicrosoftUser[];
}) => {
  vi.spyOn(microsoftUsers, 'getUsers').mockResolvedValue({
    nextSkipToken: nextPageToken,
    validUsers: users,
    invalidUsers,
  });
  await db.insert(organisationsTable).values({
    id: organisationId,
    region: 'eu',
    lastSyncStartedAt: new Date(syncStartedAt),
    tenantId,
  });

  vi.spyOn(authConnector, 'getToken').mockResolvedValue({
    token,
    expiresIn: 3600,
  });
  return mockFunction(data);
};

describe('third-party-apps-sync', () => {
  test("should update organisation's lastSyncStartedAt when it's the first page", async () => {
    const [result] = await setup({
      data: {
        ...eventData,
        pageToken: null,
      },
    });

    await result;

    const [organisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisationId));

    expect(organisation).toMatchObject({
      lastSyncStartedAt: new Date(eventData.syncStartedAt),
    });
  });

  test('should request messages sync when page contains users', async () => {
    const [result, { step }] = await setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toBeCalledWith(
      'sync-messages',
      validUsers.map((user) => ({
        name: 'outlook/third_party_apps.messages.sync.requested',
        data: {
          organisationId,
          region,
          skipStep: null,
          syncFrom: lastSyncStartedAt,
          syncTo: syncStartedAt,
          userId: user.id,
          syncStartedAt,
          tenantId,
        },
      }))
    );
  });

  test('should not request messages sync when page does not contains users', async () => {
    const [result, { step }] = await setup({
      data: eventData,
      users: [],
    });

    await result;

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          name: 'outlook/third_party_apps.inbox.sync.requested',
        }),
      ])
    );
  });

  test("should request messages sync from start when it's the first sync", async () => {
    const [result, { step }] = await setup({
      data: {
        ...eventData,
        lastSyncStartedAt: null,
      },
    });

    await result;
    expect(step.sendEvent).toBeCalledWith(
      'sync-messages',
      validUsers.map((user) => ({
        name: 'outlook/third_party_apps.messages.sync.requested',
        data: {
          organisationId,
          region,
          skipStep: null,
          syncFrom: null,
          syncTo: syncStartedAt,
          userId: user.id,
          syncStartedAt,
          tenantId,
        },
      }))
    );
  });

  test("should request messages sync from last sync date when it's not the first sync", async () => {
    const [result, { step }] = await setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toBeCalledWith(
      'sync-messages',
      validUsers.map((user) => ({
        name: 'outlook/third_party_apps.messages.sync.requested',
        data: {
          organisationId,
          region,
          skipStep: null,
          syncFrom: eventData.lastSyncStartedAt,
          syncTo: eventData.syncStartedAt,
          userId: user.id,
          syncStartedAt,
          tenantId,
        },
      }))
    );
  });

  test('should request sync of next page when there is a next page', async () => {
    const [result, { step }] = await setup({
      data: eventData,
      nextPageToken: 'next-page-token',
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(expect.any(String), {
      name: 'outlook/third_party_apps.sync.requested',
      data: {
        ...eventData,
        pageToken: 'next-page-token',
      },
    });
  });

  test('should not request sync of next page when there no next page', async () => {
    const [result, { step }] = await setup({
      data: eventData,
      nextPageToken: null,
    });

    await result;

    expect(step.sendEvent).not.toBeCalledWith('sync-next-page', {
      name: 'outlook/third_party_apps.sync.requested',
    });
  });

  test('it should return status "completed" when their is no next page', async () => {
    const [result] = await setup({
      data: eventData,
      nextPageToken: null,
    });

    await expect(result).resolves.toMatchObject({ status: 'completed' });
  });

  test('it should return status "ongoing" when their is a next page', async () => {
    const [result] = await setup({
      data: eventData,
      nextPageToken: 'page-token',
    });

    await expect(result).resolves.toMatchObject({ status: 'ongoing' });
  });
});
