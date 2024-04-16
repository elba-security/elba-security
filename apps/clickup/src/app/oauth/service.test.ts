import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as auth from '@/connectors/auth';
import * as teams from '@/connectors/team';
import * as crypto from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'code';
const region = 'us';
const now = new Date();
const accessToken = 'access-token';
const teamId = 'site-id';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
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
    const getAccessToken = vi.spyOn(auth, 'getAccessToken').mockResolvedValue(accessToken);

    const getTeamId = vi.spyOn(teams, 'getTeamId').mockResolvedValue(teamId);

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(accessToken);
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken,
        teamId,
        region,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'clickup/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        region,
        syncStartedAt: Date.now(),
      },
    });
    expect(crypto.encrypt).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);
    expect(getTeamId).toBeCalledWith(accessToken);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry

    await db.insert(Organisation).values(organisation);

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
        .select({ accessToken: Organisation.accessToken })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'clickup/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        region,
        syncStartedAt: Date.now(),
      },
    });
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
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
