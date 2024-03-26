import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import { registerOrganisation } from './service';

const token = 'test-token';
const region = 'us';
const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  token,
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
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue({
      users: [
        {
          id: 'user-id',
          name: 'Username',
          email: 'user@gmail.com',
        },
      ],
      pagination: {
        page: '1',
        per_page: 10,
        total_entries: 1,
        total_pages: 1,
      },
    });
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
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
      name: 'apollo/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
        page: null,
      },
    });
    expect(getUsers).toBeCalledWith(token, null);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    const getUsers = vi.spyOn(userConnector, 'getUsers').mockResolvedValue({
      users: [
        {
          id: 'user-id',
          name: 'Username',
          email: 'user@gmail.com',
        },
      ],
      pagination: {
        page: '1',
        per_page: 10,
        total_entries: 1,
        total_pages: 1,
      },
    });
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        region,
      })
    ).resolves.toBeUndefined();
    // check if the token in the database is updated
    await expect(
      db
        .select({
          token: Organisation.token,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token,
      },
    ]);
    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'apollo/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
        page: null,
      },
    });
    expect(getUsers).toBeCalledWith(token, null);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue({
      users: [
        {
          id: 'user-id',
          name: 'Username',
          email: 'user@gmail.com',
        },
      ],
      pagination: {
        page: '1',
        per_page: 10,
        total_entries: 1,
        total_pages: 1,
      },
    });
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      registerOrganisation({
        organisationId: wrongId,
        token,
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
