import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { env } from '@/env';
import * as userConnector from '@/connectors/users';
import { registerOrganisation } from './service';

const token = env.VERCEL_API_TOKEN;
const teamId= 'test-id';
const region = 'us';
const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  token,
  teamId,
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
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        teamId,
        region,
      })
    ).resolves.toBeUndefined();

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
        region,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'vercel/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
        page:null,
      },
    });
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        teamId,
        region,
      })
    ).resolves.toBeUndefined();

    // check if the token in the database is updated
    await expect(
      db
        .select({
          token: Organisation.token,
          teamId: Organisation.teamId,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
        teamId,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'vercel/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
        page:null,
      },
    });
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);

    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      registerOrganisation({
        organisationId: wrongId,
        token,
        teamId,
        region,
      })
    ).rejects.toThrowError(error);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
