import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as organizationConnector from '@/connectors/elastic/organization';
import * as crypto from '@/common/crypto';
import { registerOrganisation } from './service';

const apiKey = 'test-apiKey';
const region = 'us';
const now = new Date();
const organizationId = 'test-organization-id';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiKey,
  region,
};

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
    // mocked the getOrganizationId function
    // @ts-expect-error -- this is a mock
    const getOrganizationId = vi
      .spyOn(organizationConnector, 'getOrganizationId')
      .mockResolvedValue({ organizationId });
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(apiKey);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        region,
      })
    ).resolves.toBeUndefined();
    expect(getOrganizationId).toBeCalledTimes(1);
    expect(getOrganizationId).toBeCalledWith({ apiKey });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiKey,
        region,
      },
    ]);
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'elastic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
        },
      },
      {
        name: 'elastic/app.installed',
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
    // mocked the getOrganizationId function
    // @ts-expect-error -- this is a mock
    const getOrganizationId = vi
      .spyOn(organizationConnector, 'getOrganizationId')
      .mockResolvedValue({ organizationId });
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getOrganizationId).toBeCalledTimes(1);
    expect(getOrganizationId).toBeCalledWith({ apiKey });

    // check if the apiKey in the database is updated
    await expect(
      db
        .select({
          apiKey: organisationsTable.apiKey,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiKey,
      },
    ]);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'elastic/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
        },
      },
      {
        name: 'elastic/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getOrganizationId function
    // @ts-expect-error -- this is a mock
    vi.spyOn(organizationConnector, 'getOrganizationId').mockResolvedValue(organizationId);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      registerOrganisation({
        organisationId: wrongId,
        apiKey,
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
