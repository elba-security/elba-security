import { expect, test, describe, vi } from 'vitest';
import * as client from '@/inngest/client';
import { refreshThirdPartyAppsObject } from './service';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { eq } from 'drizzle-orm';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  token: 'token',
  region: 'us',
};

describe('refreshThirdPartyAppsObject', () => {
  test('should throws when organisation is not registered', async () => {
    await expect(refreshThirdPartyAppsObject({
      organisationId: 'organisation-id',
      userId: 'user-id',
      appId: 'app-id',
    })).rejects.toStrictEqual(
      new Error(`Could not retrieve an organisation with id=${organisation.id}`)
    );
  });

  test('should schedule the third party app refresh for the user', async () => {
    const send = vi.spyOn(client.inngest, 'send').mockResolvedValue({ ids: [] });
    await db.insert(Organisation).values(organisation);

    await expect(refreshThirdPartyAppsObject({
      organisationId: 'organisation-id',
      userId: 'user-id',
      appId: 'app-id',
    })).resolves.toStrictEqual({
      success: true,
    });
    
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'third-party-apps/page_sync.requested',
      data: {
        organisationId: organisation.id,
        appId: 'app-id',
        userId: 'user-id',
      },
    });
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([organisation]);
  });
});