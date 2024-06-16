import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as crypto from '@/common/crypto';
import * as organizations from '@/connectors/make/organizations';
import { registerOrganisation } from './service';
import { MakeError } from '@/connectors/commons/error';

const token = 'test-token';
const zoneDomain = 'eu2.make.com';
const organizationIds = ['organization-id'];
const region = 'us';
const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  token,
  zoneDomain,
  organizationIds,
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
    const getOrganizationIds = vi
      .spyOn(organizations, 'getOrganizationIds')
      .mockResolvedValue(organizationIds);

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    vi.spyOn(crypto, 'encrypt').mockResolvedValue(token);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        zoneDomain,
        region,
      })
    ).resolves.toBeUndefined();

    expect(getOrganizationIds).toBeCalledWith(token, zoneDomain);
    expect(getOrganizationIds).toBeCalledTimes(1);

    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    if (!storedOrganisation) {
      throw new MakeError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.token)).resolves.toEqual(token);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'make/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
        page: null,
      },
    });
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    await db.insert(Organisation).values(organisation);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        zoneDomain,
        region,
      })
    ).resolves.toBeUndefined();

    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    if (!storedOrganisation) {
      throw new MakeError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(crypto.decrypt(storedOrganisation.token)).resolves.toEqual(token);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'make/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
        page: null,
      },
    });
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    await expect(
      registerOrganisation({
        organisationId: wrongId,
        token,
        zoneDomain,
        region,
      })
    ).rejects.toThrowError(error);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    expect(send).toBeCalledTimes(0);
  });
});
