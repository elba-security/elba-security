import { expect, test, describe } from 'vitest';
import { db } from '@/lib/db';
import { organizations } from '@/schemas';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { scheduleUsersScans } from './schedule-users-scans';

const ids = Array.from({ length: 5 }, (_, i) => `${i}`);
const mockedOrganizations = ids.map((id) => ({
  id,
  tenantId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  elbaOrganizationId: `45b76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
}));

const setup = createFunctionMock(scheduleUsersScans);

describe('schedule-users-scans', () => {
  test('should not schedule any jobs when there are no orgs', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ installationIds: [] });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are installations', async () => {
    await db.insert(organizations).values(mockedOrganizations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      mockedOrganizations,
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'scan-users',
      mockedOrganizations.map(({ tenantId, elbaOrganizationId }) => ({
        name: 'users/scan',
        data: { tenantId, organizationId: elbaOrganizationId, isFirstScan: false },
      }))
    );
  });
});
