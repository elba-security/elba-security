import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { NonRetriableError } from 'inngest';
import { organizations } from '@/schemas';
import { db } from '@/lib/db';
import * as microsoftModules from '@/repositories/microsoft/graph-api';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { startUsersScan } from './start-users-scan';

const ids = Array.from({ length: 5 }, (_, i) => `${i}`);
const mockedOrganizations = ids.map((id) => ({
  id: `45c76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  tenantId: `45a76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
  elbaOrganizationId: `45b76301-f1dd-4a77-b12f-9d7d3fca3c9${id}`,
}));

vi.spyOn(microsoftModules, 'getTokenByTenantId').mockResolvedValue({
  accessToken: 'token',
  scopes: [],
});

const setup = createFunctionMock(startUsersScan, 'users/start');

const now = Date();

describe('start-users-scan', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should not scan users page when organization could not be retrieved', async () => {
    const [result, { step }] = setup({
      tenantId: 'unknownId',
      isFirstScan: true,
    });
    await expect(result).rejects.toBeInstanceOf(NonRetriableError);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should scan users when organization has been retrieved', async () => {
    await db.insert(organizations).values(mockedOrganizations);

    // targeted installation
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- test conviency
    const mockedOrganization = mockedOrganizations[0]!;
    const [result, { step }] = setup({
      tenantId: mockedOrganization.tenantId,
      isFirstScan: true,
    });

    await expect(result).resolves.toStrictEqual({
      status: 'started',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-users', {
      name: 'users/scan',
      data: {
        accessToken: 'token',
        tenantId: mockedOrganization.tenantId,
        organizationId: mockedOrganization.elbaOrganizationId,
        syncStartedAt: Date.now().toString(),
        isFirstScan: true,
      },
    });
  });
});
