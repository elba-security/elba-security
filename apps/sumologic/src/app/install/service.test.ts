import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/sumologic/users';
import * as crypto from '@/common/crypto';
import { registerOrganisation } from './service';

const accessId = 'test-access-id';
const accessKey = 'test-access-key';
const sourceRegion = 'eu';
const region = 'us';
const ownerId = 'test-owner-id';
const now = new Date();

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessId,
  accessKey,
  sourceRegion,
  region,
  ownerId,
};

const getOwnerIdData = { ownerId };

describe('registerOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation id is valid and the organisation is not registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getOwnerId function
    const getOwnerId = vi.spyOn(userConnector, 'getOwnerId').mockResolvedValue(getOwnerIdData);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(accessId);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        accessId,
        accessKey,
        sourceRegion,
        region,
      })
    ).resolves.toBeUndefined();
    expect(getOwnerId).toBeCalledTimes(1);
    expect(getOwnerId).toBeCalledWith({ accessId, accessKey, sourceRegion });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessId,
        accessKey,
        sourceRegion,
        region,
        ownerId,
      },
    ]);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'sumologic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'sumologic/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
    expect(crypto.encrypt).toBeCalledTimes(1);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getOwnerId function
    const getOwnerId = vi.spyOn(userConnector, 'getOwnerId').mockResolvedValue(getOwnerIdData);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(accessId);

    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        accessId,
        accessKey,
        sourceRegion,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getOwnerId).toBeCalledTimes(1);
    expect(getOwnerId).toBeCalledWith({ accessId, accessKey, sourceRegion });

    // check if the accessId in the database is updated
    await expect(
      db
        .select({
          accessId: organisationsTable.accessId,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessId,
      },
    ]);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'sumologic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'sumologic/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getOwnerId function
    vi.spyOn(userConnector, 'getOwnerId').mockResolvedValue(getOwnerIdData);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      registerOrganisation({
        organisationId: wrongId,
        accessId,
        accessKey,
        sourceRegion,
        region,
      })
    ).rejects.toThrowError(error);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
