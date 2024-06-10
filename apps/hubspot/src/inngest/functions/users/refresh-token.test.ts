import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import * as authConnector from '@/connectors/auth';
import { refreshSaaSToken } from './refresh-token';

const accessToken = 'some token';
const refreshToken = 'some refresh token';
const expiresIn = 60;
const region = 'us';
const timeZone = 'us/eastern'
const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  accessToken,
  refreshToken,
  region,
  timeZone
};


const setup = createInngestFunctionMock(refreshSaaSToken, 'hubspot/token.refresh.requested');

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(authConnector, 'getRefreshToken').mockResolvedValue({
      accessToken,
      refreshToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(authConnector.getRefreshToken).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update  accesstoken and schedule the next refresh', async () => {
    await db.insert(Organisation).values(organisation);
    vi.spyOn(authConnector, 'getRefreshToken').mockResolvedValue({
        accessToken,
        refreshToken,
        expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBe(undefined);

    // check if the accessToken in the database is updated
    await expect(
        db
          .select({ accessToken: Organisation.accessToken })
          .from(Organisation)
          .where(eq(Organisation.id, organisation.id))
      ).resolves.toMatchObject([
        {
          accessToken,
        },
      ]);

    expect(authConnector.getRefreshToken).toBeCalledTimes(1);

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('schedule-token-refresh', {
      name: 'hubspot/hubspot.token.refresh.requested',
      data: {
        organisationId: organisation.id,
      },
      ts: now.getTime() + (expiresIn - 5) * 60 * 1000,
    });
  });
});
