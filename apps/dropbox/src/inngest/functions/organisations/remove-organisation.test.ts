import { expect, test, describe } from 'vitest';
import { createInngestFunctionMock, spyOnElba } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { env } from '@/env';
import { removeOrganisation } from './remove-organisation';
import { organisations } from '@/database';
import { insertOrganisations } from '@/test-utils/token';
const organisationId = '00000000-0000-0000-0000-000000000001';

const setup = createInngestFunctionMock(removeOrganisation, 'dropbox/elba_app.uninstall.requested');

describe('remove-organisation', () => {
  test("should not remove given organisation when it's not registered", async () => {
    const elba = spyOnElba();
    const [result] = setup({ organisationId });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(elba).toBeCalledTimes(0);
  });

  test("should remove given organisation when it's registered", async () => {
    const elba = spyOnElba();
    await insertOrganisations({});

    const [result] = setup({ organisationId });

    await expect(result).resolves.toBeUndefined();

    expect(elba).toBeCalledTimes(1);
    expect(elba).toBeCalledWith({
      organisationId,
      region: 'eu',
      apiKey: env.ELBA_API_KEY,
      baseUrl: env.ELBA_API_BASE_URL,
    });
    const elbaInstance = elba.mock.results.at(0)?.value;

    expect(elbaInstance?.connectionStatus.update).toBeCalledTimes(1);
    expect(elbaInstance?.connectionStatus.update).toBeCalledWith({
      hasError: true,
    });

    await expect(
      db.select().from(organisations).where(eq(organisations.organisationId, organisationId))
    ).resolves.toHaveLength(0);
  });
});
