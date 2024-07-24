import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as authConnector from '@/connectors/clickup/auth';
import * as crypto from '@/common/crypto';
import { ClickUpError } from '@/connectors/common/error';
import * as teamConnector from '@/connectors/clickup/teams';
import { setupOrganisation } from './service';

const code = 'code';
const region = 'us';
const now = new Date();
const accessToken = 'access-token';
const teamId = 'team-id';

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  teamId,
  accessToken,
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
    const getAccessToken = vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue(accessToken);
    const getTeamIds = vi.spyOn(teamConnector, 'getTeamIds').mockResolvedValue([
      {
        id: teamId,
      },
    ]);

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);

    expect(getTeamIds).toBeCalledTimes(1);
    expect(getTeamIds).toBeCalledWith(accessToken);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new ClickUpError(`Organisation with ID ${organisation.id} not found.`);
    }

    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'clickup/users.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: Date.now(),
          isFirstSync: true,
        },
      },
      {
        name: 'clickup/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const getAccessToken = vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue(accessToken);

    await db.insert(organisationsTable).values(organisation);

    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getAccessToken).toBeCalledTimes(1);
    expect(getAccessToken).toBeCalledWith(code);

    const [storedOrganisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    if (!storedOrganisation) {
      throw new ClickUpError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'clickup/users.sync.requested',
        data: {
          organisationId: organisation.id,
          syncStartedAt: Date.now(),
          isFirstSync: true,
        },
      },
      {
        name: 'clickup/app.installed',
        data: {
          organisationId: organisation.id,
        },
      },
    ]);
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const wrongId = 'wrong-id';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    await expect(
      setupOrganisation({
        organisationId: wrongId,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
