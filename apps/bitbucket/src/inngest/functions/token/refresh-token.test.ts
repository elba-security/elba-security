import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/auth';
import { handleRefreshToken } from './refresh-token';

const newToken = 'new-test-access-token';
const newRefreshToken = 'new-test-refresh-token';

const organisation = {
  id: '11111111-1111-1111-1111-111111111111',
  refreshToken: 'refresh-token-123',
  region: 'us-test-1',
  accessToken: 'access-token-123',
  tokenExpiration: 60,
  cloudId: '00000000-0000-0000-0000-000000000000',
};
const now = new Date();

const setup = createInngestFunctionMock(handleRefreshToken, 'bitbucket/token.refresh.triggered');

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should abort sync when organisation is not registered', async () => {
    const refreshAccessToken = vi.spyOn(authConnector, 'refreshAccessToken').mockResolvedValue({
      accessToken: newToken,
      expiresIn: organisation.tokenExpiration,
      refreshToken: newRefreshToken,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(refreshAccessToken).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update token and schedule the next refresh', async () => {
    await db.insert(organisationsTable).values(organisation);
    const refreshAccessToken = vi.spyOn(authConnector, 'refreshAccessToken').mockResolvedValue({
      refreshToken: newRefreshToken,
      accessToken: newToken,
      expiresIn: organisation.tokenExpiration,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBe(undefined);

    const [updatedOrganisation] = await db
      .select({ accessToken: organisationsTable.accessToken })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));

    expect(updatedOrganisation?.accessToken).toBe(newToken);
    expect(refreshAccessToken).toBeCalledTimes(1);
    expect(refreshAccessToken).toBeCalledWith(organisation.refreshToken);

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('schedule-token-refresh', {
      name: 'bitbucket/token.refresh.triggered',
      data: {
        organisationId: organisation.id,
      },
      ts: now.getTime() + organisation.tokenExpiration * 1000 - 5 * 60 * 1000,
    });
  });
});
