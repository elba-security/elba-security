import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { scheduleTokenRefresh } from './schedule-token-refresh';

const setup = createInngestFunctionMock(scheduleTokenRefresh);

export const organisations = Array.from({ length: 5 }, (_, i) => ({
  id: `00000000-0000-0000-0000-00000000000${i}`,
  tenantId: `tenant-${i}`,
  token: `token-${i}`,
  region: 'us',
}));

describe('schedule-refresh-token', () => {
  test('should not schedule any jobs when there are no organisations', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ organisations: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are organisations', async () => {
    await db.insert(organisationsTable).values(organisations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      organisations: organisations.map(({ id }) => ({ id })),
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'refresh-organisations-tokens',
      organisations.map(({ id: organisationId }) => ({
        name: 'microsoft/token.refresh.requested',
        data: { organisationId },
      }))
    );
  });
});
