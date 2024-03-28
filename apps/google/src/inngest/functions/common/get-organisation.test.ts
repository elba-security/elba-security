import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getOrganisation } from './get-organisation';

const setup = createInngestFunctionMock(
  getOrganisation,
  'google/common.get_organisation.requested'
);

describe('get-organisation', () => {
  test('should return desired organisation fields', async () => {
    await db.insert(organisationsTable).values([
      {
        googleAdminEmail: 'admin@org1.local',
        googleCustomerId: 'google-customer-id-1',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
      {
        googleAdminEmail: 'admin@org2.local',
        googleCustomerId: 'google-customer-id-2',
        id: '00000000-0000-0000-0000-000000000001',
        region: 'us',
      },
    ]);

    const [result] = setup({
      columns: ['googleCustomerId', 'googleAdminEmail', 'region'],
      organisationId: '00000000-0000-0000-0000-000000000000',
    });

    await expect(result).resolves.toStrictEqual({
      googleAdminEmail: 'admin@org1.local',
      googleCustomerId: 'google-customer-id-1',
      region: 'eu',
    });
  });

  test('should throw an error when there is no organisation with a given id ', async () => {
    await db.insert(organisationsTable).values([
      {
        googleAdminEmail: 'admin@org1.local',
        googleCustomerId: 'google-customer-id-1',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
      {
        googleAdminEmail: 'admin@org2.local',
        googleCustomerId: 'google-customer-id-2',
        id: '00000000-0000-0000-0000-000000000001',
        region: 'eu',
      },
    ]);

    const [result] = setup({
      columns: ['googleCustomerId', 'googleAdminEmail', 'region'],
      organisationId: '00000000-0000-0000-0000-000000000002',
    });

    await expect(result).rejects.toStrictEqual(
      new NonRetriableError(
        'Could not retrieve organisation with id=00000000-0000-0000-0000-000000000002'
      )
    );
  });
});
