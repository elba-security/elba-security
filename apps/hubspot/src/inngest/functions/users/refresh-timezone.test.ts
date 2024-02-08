import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import * as accountDetailsConnector  from '@/connectors/account-info';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { refreshTimeZone } from './refresh-timezone';

const accessToken = 'some token';
const refreshToken = 'some refresh token';
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


const setup = createInngestFunctionMock(refreshTimeZone, 'hubspot/timezone.refresh.requested');

describe('refresh-timezone', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should abort sync when organisation is not registered', async () => {

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update  accesstoken and schedule the next refresh', async () => {
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);
    // @ts-expect-error -- this is a mock
    // mock the getAccountDetails function to return a predefined accountDetails
    vi.spyOn(accountDetailsConnector, 'getAccountDetails').mockResolvedValue({
        timeZone
      });
    const [result] = setup({
        organisationId: organisation.id,
    });

    await expect(result).resolves.toBe(undefined);

    // check if the timeZone in the database is updated
    await expect(
        db
          .select({ timeZone: Organisation.timeZone })
          .from(Organisation)
          .where(eq(Organisation.id, organisation.id))
      ).resolves.toMatchObject([
        {
            timeZone: JSON.stringify({ timeZone}),
        },
      ]);

  });
});
