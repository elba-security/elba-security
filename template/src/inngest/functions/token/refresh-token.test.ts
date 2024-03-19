/* eslint-disable @typescript-eslint/no-non-null-assertion -- convenience */
import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/x-saas/auth';
import { decrypt, encrypt } from '@/common/crypto';
import { refreshToken } from './refresh-token';

const newAccessToken = 'new-access-token';
const newRefreshToken = 'new-refresh-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken: await encrypt('access-token'),
  refreshToken: await encrypt('refresh-token'),
  region: 'us',
};
const now = new Date();
// current token expires in an hour
const expiresAt = now.getTime() + 60 * 1000;
// next token duration
const expiresIn = 60 * 1000;

const setup = createInngestFunctionMock(refreshToken, 'x-saas/token.refresh.requested');

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should abort sync when organisation is not registered', async () => {
    const getRefreshedToken = vi.spyOn(authConnector, 'getRefreshedToken').mockResolvedValue({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(getRefreshedToken).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update encrypted token and schedule the next refresh', async () => {
    await db.insert(organisationsTable).values(organisation);
    const getRefreshedToken = vi.spyOn(authConnector, 'getRefreshedToken').mockResolvedValue({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).resolves.toBe(undefined);

    const [row] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    await expect(decrypt(row!.accessToken)).resolves.toBe(newAccessToken);
    await expect(decrypt(row!.refreshToken)).resolves.toBe(newRefreshToken);

    expect(getRefreshedToken).toBeCalledTimes(1);
    expect(getRefreshedToken).toBeCalledWith('refresh-token');

    expect(step.sleepUntil).toBeCalledTimes(1);
    expect(step.sleepUntil).toBeCalledWith(
      'wait-before-expiration',
      new Date(expiresAt - 5 * 60 * 1000)
    );

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-refresh', {
      name: 'x-saas/token.refresh.requested',
      data: {
        organisationId: organisation.id,
        expiresAt: now.getTime() + expiresIn * 1000,
      },
    });
  });
});
