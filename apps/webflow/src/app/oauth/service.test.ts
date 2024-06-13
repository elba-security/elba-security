import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as authConnector from '@/connectors/webflow/auth';
import * as sitesConnector from '@/connectors/webflow/sites';
import { setupOrganisation } from './service';
import { WebflowError } from '@/connectors/commons/error';
import { decrypt } from '@/common/crypto';

const code = 'code';
const region = 'us';
const now = new Date();
const accessToken = 'access-token';
const siteIds = ['test-id'];

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  accessToken,
  siteIds,
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

    const getSiteIds = vi.spyOn(sitesConnector, 'getSiteIds').mockResolvedValue(siteIds);

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

    expect(getSiteIds).toBeCalledWith(accessToken);
    expect(getSiteIds).toBeCalledTimes(1);

    const [storedOrganisation] = await db
      .select()
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

      if (!storedOrganisation) {
        throw new WebflowError(`Organisation with ID ${organisation.id} not found.`);
      }
      expect(storedOrganisation.region).toBe(region);
      await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'webflow/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        region,
        syncStartedAt: Date.now(),
        page: 0,
      },
    });
    
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    const getAccessToken = vi.spyOn(authConnector, 'getAccessToken').mockResolvedValue(accessToken);

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
      throw new WebflowError(`Organisation with ID ${organisation.id} not found.`);
    }
    expect(storedOrganisation.region).toBe(region);
    await expect(decrypt(storedOrganisation.accessToken)).resolves.toEqual(accessToken);


    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'webflow/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        region,
        syncStartedAt: Date.now(),
        page: 0,
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
