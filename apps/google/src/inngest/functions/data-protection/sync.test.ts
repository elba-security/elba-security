import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as googleDrives from '@/connectors/google/drives';
import { spyOnGoogleServiceAccountClient } from '@/connectors/google/__mocks__/clients';
import { GoogleDriveAccessDenied } from '@/connectors/google/errors';
import { env } from '@/common/env/server';
import { getOrganisation } from '../common/get-organisation';
import { syncDataProtection } from './sync';

const setup = createInngestFunctionMock(
  syncDataProtection,
  'google/data_protection.sync.requested'
);

describe('sync-data-protection', () => {
  test('should start data protection sync for personal and shared drives successfully', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();
    const checkGoogleDriveAdminAccessSpy = vi
      .spyOn(googleDrives, 'checkGoogleDriveAdminAccess')
      .mockResolvedValue();

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org1.local',
      googleCustomerId: 'google-customer-id-1',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const [result, { step }] = setup({
      isFirstSync: true,
      organisationId: '00000000-0000-0000-0000-000000000000',
      syncStartedAt: '2024-01-01T00:00:00.000Z',
    });

    await expect(result).resolves.toStrictEqual({ status: 'completed' });

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-organisation', {
      function: getOrganisation,
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
        columns: ['region', 'googleAdminEmail', 'googleCustomerId'],
      },
    });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org1.local', true);

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(checkGoogleDriveAdminAccessSpy).toBeCalledTimes(1);
    expect(checkGoogleDriveAdminAccessSpy).toBeCalledWith({
      auth: authClient,
    });

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('sync-personal-drives', {
      event: 'google/data_protection.sync.drives.personal.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000'",
      timeout: '30 days',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drives', {
      event: 'google/data_protection.sync.drives.shared.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000'",
      timeout: '30 days',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('sync-drives', [
      {
        data: {
          googleAdminEmail: 'admin@org1.local',
          googleCustomerId: 'google-customer-id-1',
          isFirstSync: true,
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drives.personal.requested',
      },
      {
        data: {
          googleAdminEmail: 'admin@org1.local',
          googleCustomerId: 'google-customer-id-1',
          isFirstSync: true,
          organisationId: '00000000-0000-0000-0000-000000000000',
          pageToken: null,
          region: 'eu',
        },
        name: 'google/data_protection.sync.drives.shared.requested',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      syncedBefore: '2024-01-01T00:00:00.000Z',
    });
  });

  test('should not start data protection sync for personal and shared drives when access to Google Drive is denied', async () => {
    const elba = spyOnElba();
    const serviceAccountClientSpy = spyOnGoogleServiceAccountClient();
    const unauthorizedError = new GoogleDriveAccessDenied('Access to Google Drive has been denied');
    const checkGoogleDriveAdminAccessSpy = vi
      .spyOn(googleDrives, 'checkGoogleDriveAdminAccess')
      .mockRejectedValue(unauthorizedError);

    await db.insert(organisationsTable).values({
      googleAdminEmail: 'admin@org1.local',
      googleCustomerId: 'google-customer-id-1',
      id: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const [result, { step }] = setup({
      isFirstSync: true,
      organisationId: '00000000-0000-0000-0000-000000000000',
      syncStartedAt: '2024-01-01T00:00:00.000Z',
    });

    await expect(result).rejects.toThrowError(unauthorizedError);

    expect(step.invoke).toBeCalledTimes(1);
    expect(step.invoke).toBeCalledWith('get-organisation', {
      function: getOrganisation,
      data: {
        organisationId: '00000000-0000-0000-0000-000000000000',
        columns: ['region', 'googleAdminEmail', 'googleCustomerId'],
      },
    });

    expect(serviceAccountClientSpy).toBeCalledTimes(1);
    expect(serviceAccountClientSpy).toBeCalledWith('admin@org1.local', true);

    const authClient = serviceAccountClientSpy.mock.results[0]?.value as unknown;

    expect(checkGoogleDriveAdminAccessSpy).toBeCalledTimes(1);
    expect(checkGoogleDriveAdminAccessSpy).toBeCalledWith({
      auth: authClient,
    });

    expect(step.waitForEvent).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
    expect(elba).toBeCalledTimes(0);
  });
});
