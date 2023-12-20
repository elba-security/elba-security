import { expect, test, describe, vi } from 'vitest';
import * as scanModules from '@/repositories/microsoft/tpa';
import { createFunctionMock } from '../functions/__mocks__/inngest';
import { scanThirdPartyApps } from './scan-third-party-apps';

const mockedOrganization = {
  id: 'id',
  tenantId: 'tenantId',
  organizationId: '973b95c5-5dc2-44e8-8ed6-a4ff91a7cf8d',
};

const setup = createFunctionMock(scanThirdPartyApps, 'third-party-apps/scan');

const formattedApps = [
  {
    id: 'id',
    name: 'name',
    description: 'description',
    url: 'url',
    logoUrl: 'logoUrl',
    publisherName: 'publisherName',
    users: [
      {
        id: 'id',
        scopes: [],
        metadata: {
          appRoleId: 'appRoleId',
        },
      },
    ],
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
  test('should scan third party apps and send another event if there are more pages to scan', async () => {
    const scanThirdPartyAppsMock = vi
      .spyOn(scanModules, 'scanThirdPartyAppsByTenantId')
      .mockResolvedValue({
        thirdPartyAppsObjects: { apps: formattedApps },
        pageLink: 'nextLink',
      });
    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'ongoing' });
    expect(scanThirdPartyAppsMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('scan-third-party-apps', {
      name: 'third-party-apps/scan',
      data: { ...data, cursor: 'nextLink' },
    });
  });

  test('should scan users and not send another event if there are no more page to scan', async () => {
    const scanThirdPartyAppsMock = vi
      .spyOn(scanModules, 'scanThirdPartyAppsByTenantId')
      .mockResolvedValue({
        thirdPartyAppsObjects: { apps: formattedApps },
        pageLink: undefined,
      });
    const [result, { step }] = setup(data);

    await expect(result).resolves.toStrictEqual({ status: 'completed' });
    expect(scanThirdPartyAppsMock).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledTimes(0);
  });
});
