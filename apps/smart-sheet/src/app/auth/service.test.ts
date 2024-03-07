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
import * as authConnector from '@/connectors/auth';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import { decrypt, encrypt } from '@/common/crypto';
import { setupOrganisation } from './service';

const code = 'some-code';
const region = 'us';
const now = new Date();

const expiresIn = 60;

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: await encrypt('test-access-token'),
  refreshToken: await encrypt('test-refresh-token'),
  region,
};

const getTokenResponse = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: expiresIn,
};

describe('setupOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the code is valid and the organisation is not registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // mock the getToken function to return a predefined token
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenResponse);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    // check if getToken was called correctly
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    // verify the organisation token is set in the database
    const insertedOrganisation = await db
      .select({
        accessToken: Organisation.accessToken,
        refreshToken: Organisation.refreshToken,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    expect({
      region: organisation.region,
      accessToken: await decrypt(insertedOrganisation.at(0)?.accessToken ?? ''),
      refreshToken: await decrypt(insertedOrganisation.at(0)?.refreshToken ?? ''),
    }).toStrictEqual({
      region,
      accessToken: getTokenResponse.access_token,
      refreshToken: getTokenResponse.refresh_token,
    });

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'smart-sheet/users.page_sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          region,
          page: 1,
        },
      },
      {
        name: 'smart-sheet/smart-sheet.token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + expiresIn * 1000,
        },
      },
    ]);
  });

  test('should setup organisation when the code is valid and the organisation is already registered', async () => {
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    // mock getToken as above
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(getTokenResponse);

    // assert the function resolves without returning a value
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).resolves.toBeUndefined();

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    // check if the token in the database is updated
    const insertedOrganisation = await db
      .select({
        accessToken: Organisation.accessToken,
        refreshToken: Organisation.refreshToken,
        region: Organisation.region,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    expect({
      region: organisation.region,
      accessToken: await decrypt(insertedOrganisation.at(0)?.accessToken ?? ''),
      refreshToken: await decrypt(insertedOrganisation.at(0)?.refreshToken ?? ''),
    }).toStrictEqual({
      region,
      accessToken: getTokenResponse.access_token,
      refreshToken: getTokenResponse.refresh_token,
    });

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'smart-sheet/users.page_sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: 1,
          region,
        },
      },
      {
        name: 'smart-sheet/smart-sheet.token.refresh.requested',
        data: {
          organisationId: organisation.id,
          expiresAt: now.getTime() + expiresIn * 1000,
        },
      },
    ]);
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // mock inngest client
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');
    // mock getToken to reject with a dumb error for an invalid code
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);

    // assert that the function throws the mocked error
    await expect(
      setupOrganisation({
        organisationId: organisation.id,
        code,
        region,
      })
    ).rejects.toThrowError(error);

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
