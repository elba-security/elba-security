import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as authConnector from '@/connectors/auth';
import { refreshToken } from './refresh-token';

const tokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const encryptedTokens = {
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
};

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  apiDomain: 'some url',
  accessToken: encryptedTokens.accessToken,
  refreshToken: encryptedTokens.refreshToken,
  region: 'us',
};
const now = new Date();
// current token expires in an hour
const expiresAt = now.getTime() + 60 * 1000;
// next token duration
const expiresIn = 60 * 1000;

const setup = createInngestFunctionMock(
  refreshToken,
  'pipedrive/pipedrive.token.refresh.requested'
);

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(authConnector, 'getRefreshToken').mockResolvedValue({
      ...newTokens,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(authConnector.getRefreshToken).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update encrypted tokens and schedule the next refresh', async () => {
    await db.insert(Organisation).values(organisation);

    vi.spyOn(authConnector, 'getRefreshToken').mockResolvedValue({
      ...newTokens,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).resolves.toBe(undefined);

    const [updatedOrganisation] = await db
      .select({
        accessToken: Organisation.accessToken,
        refreshToken: Organisation.refreshToken,
      })
      .from(Organisation)
      .where(eq(Organisation.id, organisation.id));

    expect(updatedOrganisation?.accessToken ?? '').toBe(newTokens.accessToken);
    expect(updatedOrganisation?.refreshToken ?? '').toBe(newTokens.refreshToken);

    expect(authConnector.getRefreshToken).toBeCalledTimes(1);
    expect(authConnector.getRefreshToken).toBeCalledWith(tokens.refreshToken);

    expect(step.sleepUntil).toBeCalledTimes(1);
    expect(step.sleepUntil).toBeCalledWith(
      'wait-before-expiration',
      new Date(expiresAt - 5 * 60 * 1000)
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-refresh', {
      name: 'pipedrive/pipedrive.token.refresh.requested',
      data: {
        organisationId: organisation.id,
        expiresAt: now.getTime() + expiresIn * 1000,
      },
    });
  });
});
