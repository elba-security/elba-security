import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { env } from '@/common/env';
import { removeOrganisation } from './remove-organisation';

const apiToken = 'test-access-token';
const domain = 'test-domain';
const email = 'test@email';
const authUserId = 'test-authUser-id';
const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  apiToken: await encrypt(apiToken),
  region: 'us',
  domain,
  email,
  authUserId,
};
const setup = createInngestFunctionMock(removeOrganisation, 'jira/app.uninstalled');

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
      organisationId: organisation.id,
      region: organisation.region,
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;
    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      errorType: 'unauthorized',
    });
    await expect(
      db.select().from(organisationsTable).where(eq(organisationsTable.id, organisation.id))
    ).resolves.toHaveLength(0);
  });
});
