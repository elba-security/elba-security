import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as client from '@/inngest/client';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { startThirdPartyAppsSync } from './service';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  tenantId: 'some-tenant-id',
  token: 'some-token',
  region: 'us',
};

const now = Date.now();

describe('startThirdPartyAppsSync', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should throws when organisation is not registered', async () => {
    await expect(startThirdPartyAppsSync(organisation.id)).rejects.toStrictEqual(
      new Error(`Could not retrieve an organisation with id=${organisation.id}`)
    );
  });

  test('should schedule apps sync when the organisation is registered', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    await db.insert(organisationsTable).values(organisation);

    await expect(startThirdPartyAppsSync(organisation.id)).resolves.toBeUndefined();
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'microsoft/third_party_apps.sync.requested',
      data: {
        organisationId: organisation.id,
        syncStartedAt: Date.now(),
        isFirstSync: true,
        skipToken: null,
      },
    });
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([organisation]);
  });
});
