import { expect, test, describe, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { getOrganisation } from './get-organisation';

const setup = createInngestFunctionMock(
  getOrganisation,
  'outlook/common.get_organisation.requested'
);

describe('get-organisation', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values([
      {
        id: '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51',
        tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
        region: 'eu',
      },
      {
        id: '791186a4-1df0-4c57-a442-ba4ff332b101',
        tenantId: 'f5151789-9d9d-4a94-ac74-7ac456422f26',
        region: 'us',
      },
    ]);
  });
  test('should return desired organisation fields', async () => {
    const [result] = setup({
      columns: ['tenantId', 'region'],
      organisationId: '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51',
    });

    await expect(result).resolves.toStrictEqual({
      tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
      region: 'eu',
    });
  });

  test('should throw an error when there is no organisation with a given id ', async () => {
    const [result] = setup({
      columns: ['tenantId', 'region'],
      organisationId: '00000000-0000-0000-0000-000000000002',
    });

    await expect(result).rejects.toStrictEqual(
      new NonRetriableError(
        'Could not retrieve organisation with id=00000000-0000-0000-0000-000000000002'
      )
    );
  });
});
