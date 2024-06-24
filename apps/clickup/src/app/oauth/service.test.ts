import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as auth from '@/connectors/clickup/auth';
import * as teams from '@/connectors/clickup/team';
import * as crypto from '@/common/crypto';
import { setupOrganisation } from './service';
import { ClickUpError } from '@/connectors/commons/error';

const code = 'code';
const region = 'us';
const now = new Date();
const accessToken = 'access-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
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
    const getAccessToken = vi.spyOn(auth, 'getAccessToken').mockResolvedValue(accessToken);

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

    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

      if (!storedOrganisation) {
        throw new ClickUpError(`Organisation with ID ${organisation.id} not found.`);
      }
    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'clickup/users.start_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: Date.now(),
      },
    });
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    const getAccessToken = vi.spyOn(auth, 'getAccessToken').mockResolvedValue(accessToken);

    await db.insert(Organisation).values(organisation);

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
    .from(Organisation)
    .where(eq(Organisation.id, organisation.id));

    if (!storedOrganisation) {
      throw new ClickUpError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'clickup/users.start_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: Date.now(),
      },
    });
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    await expect(
      setupOrganisation({
        organisationId: wrongId,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
