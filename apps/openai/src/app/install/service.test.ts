import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/openai/users';
import { registerOrganisation } from './service';

const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  apiKey: 'key-somekey',
  organizationId: 'org-someopenaiorgid',
  region: 'us',
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
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey: organisation.apiKey,
        sourceOrganizationId: organisation.organizationId,
        region: organisation.region,
      })
    ).resolves.toBeUndefined();

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiKey: organisation.apiKey,
        organizationId: organisation.organizationId,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'openai/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          region: organisation.region,
        },
      },
      {
        name: 'openai/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        apiKey: organisation.apiKey,
        sourceOrganizationId: organisation.organizationId,
        region: organisation.region,
      })
    ).resolves.toBeUndefined();

    // check if the apiKey in the database is updated
    await expect(
      db
        .select({
          apiKey: organisationsTable.apiKey,
          organizationId: organisationsTable.organizationId,
        })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        apiKey: organisation.apiKey,
        organizationId: organisation.organizationId,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'openai/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          region: organisation.region,
        },
      },
      {
        name: 'openai/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });
});
