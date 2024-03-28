import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getOrganisation } from '../common/get-organisation';
import { syncDataProtection } from './sync';

const setup = createInngestFunctionMock(
  syncDataProtection,
  'google/data_protection.sync.requested'
);

describe('sync-data-protection', () => {
  test('should start data protection sync for personal and shared drives successfully', async () => {
    const elba = spyOnElba();

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

    expect(step.waitForEvent).toBeCalledTimes(2);
    expect(step.waitForEvent).toBeCalledWith('sync-personal-drives', {
      event: 'google/data_protection.sync.drives.personal.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000'",
      timeout: '1day',
    });
    expect(step.waitForEvent).toBeCalledWith('sync-shared-drives', {
      event: 'google/data_protection.sync.drives.shared.completed',
      if: "async.data.organisationId == '00000000-0000-0000-0000-000000000000'",
      timeout: '1day',
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
      apiKey: 'elba-api-key',
      baseUrl: 'https://elba.local/api',
      organisationId: '00000000-0000-0000-0000-000000000000',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledTimes(1);
    expect(elbaInstance?.dataProtection.deleteObjects).toBeCalledWith({
      syncedBefore: '2024-01-01T00:00:00.000Z',
    });
  });
});
