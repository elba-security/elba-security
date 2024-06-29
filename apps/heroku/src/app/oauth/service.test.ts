import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { addSeconds } from 'date-fns';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as auth from '@/connectors/auth';
import { setupOrganisation } from './service';

const code = 'code';
const region = 'us';
const now = new Date();
const accessToken = 'access-token';
const refreshToken = 'refresh-token';
const teamId = 'team-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
  refreshToken,
  teamId,
  region,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation id is valid and the organisation is not registered', async () => {
    const getAccessToken = vi.spyOn(auth, 'getAccessToken').mockResolvedValue({
      accessToken,
      refreshToken,
      expiresIn: 7200,
    });

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken,
        refreshToken,
        region,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'heroku/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: addSeconds(new Date(), 7200).getTime(),
        },
      },
      {
        name: 'heroku/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: Date.now(),
          cursor: null,
        },
      },
      {
        name: 'heroku/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const getAccessToken = vi.spyOn(auth, 'getAccessToken').mockResolvedValue({
      accessToken,
      refreshToken,
      expiresIn: 7200,
    });

    // pre-insert an organisation to simulate an existing entry
    await db.insert(organisationsTable).values(organisation);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    // check if the token in the database is updated
    await expect(
      db
        .select({ accessToken: organisationsTable.accessToken })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken,
      },
    ]);

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'heroku/token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: addSeconds(new Date(), 7200).getTime(),
        },
      },
      {
        name: 'heroku/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: Date.now(),
          cursor: null,
        },
      },
      {
        name: 'heroku/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      setupOrganisation({
        organisationId: wrongId,
        code,
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
