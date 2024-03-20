import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { decrypt, encrypt } from '@/common/crypto';
import * as authConnector from '@/connectors/gitlab/auth';
import { refreshToken } from './refresh-token';

const tokens = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

const encryptedTokens = {
  accessToken: await encrypt(tokens.accessToken),
  refreshToken: await encrypt(tokens.refreshToken),
};

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: encryptedTokens.accessToken,
  refreshToken: encryptedTokens.refreshToken,
  region: 'us',
};
const now = new Date();
// current token expires in an hour
const expiresAt = now.getTime() + 60 * 1000;
// next token duration
const expiresIn = 60 * 1000;

const setup = createInngestFunctionMock(refreshToken, 'gitlab/token.refresh.requested');

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
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
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
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    await expect(decrypt(updatedOrganisation?.accessToken ?? '')).resolves.toBe(
      newTokens.accessToken
    );
    await expect(decrypt(updatedOrganisation?.refreshToken ?? '')).resolves.toBe(
      newTokens.refreshToken
    );

    expect(authConnector.getRefreshToken).toBeCalledTimes(1);
    expect(authConnector.getRefreshToken).toBeCalledWith(tokens.refreshToken);

    expect(step.sleepUntil).toBeCalledTimes(1);
    expect(step.sleepUntil).toBeCalledWith(
      'wait-before-expiration',
      new Date(expiresAt - 5 * 60 * 1000)
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-refresh', {
      name: 'gitlab/token.refresh.requested',
      data: {
        organisationId: organisation.id,
        expiresAt: now.getTime() + expiresIn * 1000,
      },
    });
  });
});
