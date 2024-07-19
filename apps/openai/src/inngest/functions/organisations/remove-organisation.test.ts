import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { env } from '@/common/env';
import { removeOrganisation } from './remove-organisation';

const organisation = {
  id: '00000000-0000-0000-0000-000000000000',
  apiKey: 'some-api-key',
  organizationId: 'some-organization-id',
  region: 'us',
};

const setup = createInngestFunctionMock(removeOrganisation, 'openai/app.uninstalled');

describe('remove-organisation', () => {
  test("should not remove given organisation when it's not registered", async () => {
    const elba = spyOnElba();
    const [result] = setup({ organisationId: organisation.id });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
  });

  test("should remove given organisation when it's registered", async () => {
    const elba = spyOnElba();
    await db.insert(organisationsTable).values(organisation);

    const [result] = setup({ organisationId: organisation.id });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      baseUrl: env.ELBA_API_BASE_URL,
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });

    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
  });
});
