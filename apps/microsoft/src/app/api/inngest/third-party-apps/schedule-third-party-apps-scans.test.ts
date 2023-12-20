import { expect, test, describe, beforeAll, vi, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { organizations } from '@/schemas';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { scheduleThirdPartyAppsScans } from './schedule-third-party-apps-scans';

const ids = Array.from({ length: 5 }, (_, i) => `${i}`);
const mockedOrganizations = ids.map((id) => ({
  id: `45c76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  tenantId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  elbaOrganizationId: `45b76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
}));

const setup = createFunctionMock(scheduleThirdPartyAppsScans);

const now = Date();

describe('schedule-third-party-apps-scans', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should not schedule any jobs when there are no orgs', async () => {
    const [result, { step }] = setup();
    await expect(result).resolves.toStrictEqual({ status: 'scheduled' });
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should schedule jobs when there are organizations', async () => {
    await db.insert(organizations).values(mockedOrganizations);
    const [result, { step }] = setup();

    await expect(result).resolves.toStrictEqual({
      status: 'scheduled',
    });
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith(
      'start-third-party-apps-scan',
      mockedOrganizations.map(({ tenantId }) => ({
        name: 'third-party-apps/start',
        data: { tenantId, isFirstScan: false },
      }))
    );
  });
});
