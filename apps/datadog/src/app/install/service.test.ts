/**
 * DISCLAIMER:
 * The tests provided in this file are specifically designed for the `setupOrganisation` function.
 * These tests illustrate potential scenarios and methodologies relevant for SaaS integration.
 * Developers should create tests tailored to their specific implementation and requirements.
 * Mock data and assertions here are simplified and may not cover all real-world complexities.
 * Expanding upon these tests to fit the actual logic and behaviors of specific integrations is crucial.
 */
import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt, encrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const apiKey = 'api_key';
const appKey = 'app_key';
const region = 'us';
const now = new Date();

const expiresIn = 60;

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiKey: await encrypt(apiKey),
  appKey: await encrypt(appKey),
  region,
};

const getTokenResponse = {
  apiKey,
  appKey,
  expires_in: expiresIn,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation is not registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        apiKey,
        appKey,
        region,
      })
    ).resolves.toBeUndefined();

    // verify the organisation token is set in the database
    const insertedOrganisation = await db
      .select({
        apiKey: Organisation.apiKey,
        appKey: Organisation.appKey,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    expect({
      region: organisation.region,
      apiKey: await decrypt(insertedOrganisation.at(0)?.apiKey ?? ''),
      appKey: await decrypt(insertedOrganisation.at(0)?.appKey ?? ''),
    }).toStrictEqual({
      region,
      apiKey: getTokenResponse.apiKey,
      appKey: getTokenResponse.appKey,
    });

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'datadog/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        region,
      },
    });
  });

  test('should setup organisation when the organisation is already registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        apiKey: organisation.apiKey,
        appKey: organisation.appKey,
        region,
      })
    ).resolves.toBeUndefined();

    // check if the token in the database is updated
    const insertedOrganisation = await db
      .select({
        apiKey: Organisation.apiKey,
        appKey: Organisation.appKey,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    expect({
      region: organisation.region,
      apiKey: await decrypt(insertedOrganisation.at(0)?.apiKey ?? ''),
      appKey: await decrypt(insertedOrganisation.at(0)?.appKey ?? ''),
    }).toStrictEqual({
      region,
      apiKey: organisation.apiKey,
      appKey: organisation.appKey,
    });

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'datadog/users.page_sync.requested',
      data: {
        organisationId: organisation.id,
        isFirstSync: true,
        region,
        syncStartedAt: now.getTime(),
      },
    });
  });
});
