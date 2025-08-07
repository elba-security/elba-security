import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env/server';
import * as googleClientsModule from '@/connectors/google/clients';
import { removeOrganisation } from './remove-organisation';

const setup = createInngestFunctionMock(
  removeOrganisation,
  'google/common.remove_organisation.requested'
);

describe('remove-organisation', () => {
  test('should delete organisation and set connection status error successfully ', async () => {
    const elba = spyOnElba();

    // @ts-expect-error -- this is a mock
    vi.spyOn(googleClientsModule, 'getGoogleServiceAccountClient').mockResolvedValue({
      authorize: vi.fn().mockRejectedValue(new Error()),
    });

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
      organisationId: '00000000-0000-0000-0000-000000000000',
      inngestRunId: 'inngest-run-id',
    });

    await expect(result).resolves.toStrictEqual({ status: 'deleted' });

    const insertedOrganisations = await db.query.organisationsTable.findMany();
    expect(insertedOrganisations).toStrictEqual([
      {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- this is a mock
        createdAt: expect.any(Date),
        googleAdminEmail: 'admin@org2.local',
        googleCustomerId: 'google-customer-id-2',
        id: '00000000-0000-0000-0000-000000000001',
        region: 'us',
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
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({ errorType: 'unauthorized' });
  });

  test('should ignore when the client is still authorized ', async () => {
    // @ts-expect-error -- this is a mock
    vi.spyOn(googleClientsModule, 'getGoogleServiceAccountClient').mockResolvedValue({
      authorize: vi.fn().mockResolvedValue(null),
    });
    const elba = spyOnElba();

    await db.insert(organisationsTable).values([
      {
        googleAdminEmail: 'admin@org1.local',
        googleCustomerId: 'google-customer-id-1',
        id: '00000000-0000-0000-0000-000000000000',
        region: 'eu',
      },
    ]);

    const [result] = setup({
      organisationId: '00000000-0000-0000-0000-000000000000',
      inngestRunId: 'inngest-run-id',
    });

    await expect(result).resolves.toStrictEqual({
      status: 'ignored',
      message: 'Client is still authorized',
    });

    const [organisation] = await db
      .select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, '00000000-0000-0000-0000-000000000000'));
    expect(organisation).toBeDefined();

    expect(elba).toBeCalledTimes(0);
  });
});
