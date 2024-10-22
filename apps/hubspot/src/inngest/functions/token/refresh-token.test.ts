import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/hubspot/auth';
import { encrypt, decrypt } from '@/common/crypto';
import { HubspotError } from '@/connectors/hubspot/common/error';
import { refreshToken } from './refresh-token';

const timeZone = 'us/eastern';
const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const encryptedTokens = {
  accessToken: await encrypt(newTokens.accessToken),
  refreshToken: await encrypt(newTokens.refreshToken),
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  authUserId: '10001',
  accessToken: encryptedTokens.accessToken,
  refreshToken: encryptedTokens.refreshToken,
  region: 'us',
  timeZone,
  domain: 'foo-bar.hubspot.com',
  portalId: 12345,
};

const now = new Date();
// current token expires in an hour
const expiresAt = now.getTime() + 60 * 1000;
// next token duration
const expiresIn = 60 * 1000;

const setup = createInngestFunctionMock(refreshToken, 'hubspot/token.refresh.requested');

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
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!updatedOrganisation) {
      throw new HubspotError(`Organisation with ID ${organisation.id} not found.`);
    }

    await expect(decrypt(updatedOrganisation.refreshToken)).resolves.toEqual(
      newTokens.refreshToken
    );

    expect(authConnector.getRefreshToken).toBeCalledTimes(1);
    expect(authConnector.getRefreshToken).toBeCalledWith(newTokens.refreshToken);

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-refresh', {
      name: 'hubspot/token.refresh.requested',
      data: {
        organisationId: organisation.id,
        expiresAt: now.getTime() + expiresIn * 1000,
      },
    });
  });
});
