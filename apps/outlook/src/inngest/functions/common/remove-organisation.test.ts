import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env/server';
import { removeOrganisation } from './remove-organisation';

const setup = createInngestFunctionMock(
  removeOrganisation,
  'outlook/common.remove_organisation.requested'
);

describe('remove-organisation', () => {
  test('should delete organisation and set connection status error successfully ', async () => {
    const elba = spyOnElba();

    await db.insert(organisationsTable).values([
      {
        id: '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51',
        tenantId: 'c647a27f-7060-4e8d-acc9-05a42218235b',
        token: 'token-org-1',
        region: 'eu',
      },
      {
        id: '791186a4-1df0-4c57-a442-ba4ff332b101',
        tenantId: 'f5151789-9d9d-4a94-ac74-7ac456422f26',
        token: 'token-org-2',
        region: 'us',
      },
    ]);

    const [result] = setup({ organisationId: '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51' });

    await expect(result).resolves.toStrictEqual({ status: 'deleted' });

    const insertedOrganisations = await db.query.organisationsTable.findMany();
    expect(insertedOrganisations).toStrictEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
        createdAt: expect.any(Date),
        id: '791186a4-1df0-4c57-a442-ba4ff332b101',
        tenantId: 'f5151789-9d9d-4a94-ac74-7ac456422f26',
        lastSyncStartedAt: null,
        token: 'token-org-2',
        region: 'us',
      },
    ]);

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: '4ef9c9ad-947b-4ec2-bbc4-cbe3190eee51',
      region: 'eu',
    });

    const elbaInstance = elba.mock.results[0]?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({ errorType: 'unauthorized' });
  });
});
