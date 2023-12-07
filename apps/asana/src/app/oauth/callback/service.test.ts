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
import * as webhookConnector from '@/connectors/webhook';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import type { GetTokenResponseData } from '@/connectors/auth';
import { setupOrganisation } from './service';

const code = 'some-code';
const now = new Date();

const token: GetTokenResponseData = {
  access_token: 'some_access_token',
  refresh_token: 'some_refresh_token',
  token_type: 'some_token_type',
  expires_in: 12000,
  data: {
    id: 'some_data_id',
    gid: 'some_data_gid',
    name: 'some_data_name',
    email: 'some_data_email',
  },
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: token.access_token,
  expiresIn: token.expires_in,
  refreshToken: token.refresh_token,
  asanaId: token.data.id,
  gid: token.data.gid,
  name: token.data.name,
  email: token.data.email,
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
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue(token);
    const registerWebhook = vi
      .spyOn(webhookConnector, 'registerWebhook')
      .mockResolvedValue(undefined);

    // assert the function resolves without returning a value
    await expect(setupOrganisation(organisation.id, code)).resolves.toBeUndefined();

    // check if getToken was called correctly
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    // verify that the webhook is registered
    expect(registerWebhook).toBeCalledTimes(1);
    expect(registerWebhook).toBeCalledWith(organisation.id, token.access_token);

    // verify the organisation token is set in the database
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([organisation]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'users/sync',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        page: null,
      },
    });
  });

  test('should update the organisation tokens and remove the webhook secret when the code is valid and the organisation is already registered', async () => {
    const newAccessToken = 'some-new-access-token';
    const newRefreshToken = 'some-new-refresh-token';
    // mock inngest client, only inngest.send should be used
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const registerWebhook = vi
      .spyOn(webhookConnector, 'registerWebhook')
      .mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    // mock getToken as above
    const getToken = vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      ...token,
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    });

    // assert the function resolves without returning a value
    await expect(setupOrganisation(organisation.id, code)).resolves.toBeUndefined();

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    // verify that the webhook is registered
    expect(registerWebhook).toBeCalledTimes(1);
    expect(registerWebhook).toBeCalledWith(organisation.id, newAccessToken);

    // check if the organisation in the database is updated
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        webhookSecret: null,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'users/sync',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        syncStartedAt: now.getTime(),
        page: null,
      },
    });
  });

  test('should not setup the organisation when the code is invalid', async () => {
    // mock inngest client
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const error = new Error('invalid code');
    // mock getToken to reject with a dumb error for an invalid code
    const getToken = vi.spyOn(authConnector, 'getToken').mockRejectedValue(error);
    const registerWebhook = vi
      .spyOn(webhookConnector, 'registerWebhook')
      .mockResolvedValue(undefined);

    // assert that the function throws the mocked error
    await expect(setupOrganisation(organisation.id, code)).rejects.toThrowError(error);

    // verify getToken usage
    expect(getToken).toBeCalledTimes(1);
    expect(getToken).toBeCalledWith(code);

    expect(registerWebhook).toBeCalledTimes(0);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
