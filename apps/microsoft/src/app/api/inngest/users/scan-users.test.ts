import { expect, test, describe, vi } from 'vitest';
import * as scanModules from '@/repositories/microsoft/users';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { scanUsers } from './scan-users';

const mockedOrganization = {
  id: 'id',
  tenantId: 'tenantId',
  organizationId: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
};

const setup = createFunctionMock(scanUsers, 'users/scan');

const formattedUsers = [
  {
    id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c91',
    email: 'email@example.com',
    displayName: 'displayName',
    additionalEmails: [],
  },
  {
    id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c92',
    email: 'email2@example.com',
    displayName: 'displayName2',
    additionalEmails: [],
  },
];

const data = {
  accessToken: 'accessToken',
  tenantId: 'tenantId',
  organizationId: mockedOrganization.organizationId,
  syncStartedAt: new Date().toISOString(),
  isFirstScan: true,
  cursor: undefined,
};

describe('scan-users', () => {
  test('should scan users and send another event if there are more pages to scan', async () => {
    const scanUsersMock = vi.spyOn(scanModules, 'scanUsersByTenantId').mockResolvedValue({
      formattedUsers,
      nextLink: 'nextLink',
    });
    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(scanUsersMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-users', {
      name: 'users/scan',
      data: { ...data, cursor: 'nextLink' },
    });
  });

  test('should scan users and not send another event if there are no more page to scan', async () => {
    const scanUsersMock = vi.spyOn(scanModules, 'scanUsersByTenantId').mockResolvedValue({
      formattedUsers,
      nextLink: undefined,
    });
    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    expect(scanUsersMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
