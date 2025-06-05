import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import * as googleUsers from '@/connectors/google/users';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { syncThirdPartyApps, type SyncThirdPartyAppsRequested } from './sync';

const defaultUsers = [
  {
    id: 'user-id-2',
    name: { fullName: 'John Doe' },
    primaryEmail: 'user2@org.local',
    emails: [{ address: 'john.doe@org.local' }],
  },
  {
    id: 'user-id-1',
    name: { fullName: 'Admin' },
    primaryEmail: 'admin@org.local',
    isEnrolledIn2Sv: true,
  },
];

const organisationId = '4f9b95b1-07ec-4356-971c-5a9d328e911c';

const eventData: SyncThirdPartyAppsRequested['gmail/third_party_apps.sync.requested']['data'] = {
  organisationId,
  region: 'eu',
  googleAdminEmail: 'admin@foo.com',
  googleCustomerId: 'foo-customer-id',
  syncStartedAt: '2025-06-02T13:32:08.000Z',
  lastSyncStartedAt: '2025-06-01T13:32:08.000Z',
  pageToken: null,
};

const mockFunction = createInngestFunctionMock(
  syncThirdPartyApps,
  'gmail/third_party_apps.sync.requested'
);

const setup = async ({
  data,
  nextPageToken = 'next-page-token',
  users = defaultUsers,
}: {
  data: Parameters<typeof mockFunction>[0];
  nextPageToken?: string | null;
  users?: typeof defaultUsers;
}) => {
  spyOnGoogleServiceAccountClient();
  vi.spyOn(googleUsers, 'checkUserIsAdmin').mockResolvedValue();
  vi.spyOn(googleUsers, 'listGoogleUsers').mockResolvedValue({
    users,
    nextPageToken,
  });
  await db.insert(organisationsTable).values({
    googleAdminEmail: 'admin@org.local',
    googleCustomerId: 'google-customer-id',
    id: organisationId,
    region: 'eu',
    lastSyncStartedAt: new Date('2025-06-01T13:32:08.805Z'),
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

  test('should request inboxes sync when page contains users', async () => {
    const [result, { step }] = await setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        {
          name: 'gmail/third_party_apps.inbox.sync.requested',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          data: expect.objectContaining({
            userId: 'user-id-1',
            email: 'admin@org.local',
            pageToken: null,
          }),
        },
        {
          name: 'gmail/third_party_apps.inbox.sync.requested',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          data: expect.objectContaining({
            userId: 'user-id-2',
            email: 'user2@org.local',
            pageToken: null,
          }),
        },
      ])
    );
  });

  test('should not request inboxes sync when page does not contains users', async () => {
    const [result, { step }] = await setup({
      data: eventData,
      users: [],
    });

    await result;

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({
          name: 'gmail/third_party_apps.inbox.sync.requested',
        }),
      ])
    );
  });

  test("should request inboxes sync from start when it's the first sync", async () => {
    const [result, { step }] = await setup({
      data: {
        ...eventData,
        lastSyncStartedAt: null,
      },
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        {
          name: 'gmail/third_party_apps.inbox.sync.requested',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          data: expect.objectContaining({
            syncFrom: null,
            syncTo: eventData.syncStartedAt,
          }),
        },
        {
          name: 'gmail/third_party_apps.inbox.sync.requested',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          data: expect.objectContaining({
            syncFrom: null,
            syncTo: eventData.syncStartedAt,
          }),
        },
      ])
    );
  });

  test("should request inboxes sync from last sync date when it's not the first sync", async () => {
    const [result, { step }] = await setup({
      data: eventData,
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        {
          name: 'gmail/third_party_apps.inbox.sync.requested',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          data: expect.objectContaining({
            syncFrom: eventData.lastSyncStartedAt,
            syncTo: eventData.syncStartedAt,
          }),
        },
        {
          name: 'gmail/third_party_apps.inbox.sync.requested',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a test
          data: expect.objectContaining({
            syncFrom: eventData.lastSyncStartedAt,
            syncTo: eventData.syncStartedAt,
          }),
        },
      ])
    );
  });

  test('should request sync of next page when there is a next page', async () => {
    const [result, { step }] = await setup({
      data: eventData,
      nextPageToken: 'next-page-token',
    });

    await result;

    expect(step.sendEvent).toHaveBeenCalledWith(expect.any(String), {
      name: 'gmail/third_party_apps.sync.requested',
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

    expect(step.sendEvent).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        name: 'gmail/third_party_apps.sync.requested',
      })
    );
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
