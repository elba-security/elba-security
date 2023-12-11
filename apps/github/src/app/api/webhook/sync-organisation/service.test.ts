import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as client from '@/inngest/client';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { syncOrganisation } from './service';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  installationId: 0,
  accountLogin: 'login-0',
};

const now = Date.now();

describe('handleElbaOrganisationActivated', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should throws when organisation is not registered', async () => {
    await expect(syncOrganisation(organisation.id)).rejects.toStrictEqual(
      new Error(`Could not retrieve an organisation with id=${organisation.id}`)
    );
  });

  test('should schedule apps sync when the organisation is registered', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    await db.insert(Organisation).values(organisation);

    await expect(syncOrganisation(organisation.id)).resolves.toStrictEqual({
      success: true,
    });
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'third-party-apps/page_sync.requested',
      data: {
        organisationId: organisation.id,
        installationId: organisation.installationId,
        accountLogin: organisation.accountLogin,
        syncStartedAt: Date.now(),
        isFirstSync: true,
        cursor: null,
      },
    });
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([organisation]);
  });
});
