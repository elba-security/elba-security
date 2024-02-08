import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/microsoft/auth';
import { decrypt, encrypt } from '@/common/crypto';
import { refreshToken } from './refresh-token';

const token = 'test-token';
const encryptedToken = await encrypt(token);

const newToken = 'new-access-token';

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: encryptedToken,
  tenantId: 'tenant-id',
  region: 'us',
};
const now = new Date();
const expiresIn = 60;

const setup = createInngestFunctionMock(refreshToken, 'microsoft/token.refresh.triggered');

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      token: newToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(authConnector.getToken).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should update encrypted token and schedule the next refresh', async () => {
    await db.insert(organisationsTable).values(organisation);
    vi.spyOn(authConnector, 'getToken').mockResolvedValue({
      token: newToken,
      expiresIn,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
    });

    await expect(result).resolves.toBe(undefined);

    const [updatedOrganisation] = await db
      .select({ token: organisationsTable.token })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    await expect(decrypt(updatedOrganisation?.token ?? '')).resolves.toBe(newToken);

    expect(authConnector.getToken).toBeCalledTimes(1);
    expect(authConnector.getToken).toBeCalledWith(organisation.tenantId);

    // check that the function continue the pagination process
    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('schedule-token-refresh', {
      name: 'microsoft/token.refresh.triggered',
      data: {
        organisationId: organisation.id,
      },
      ts: now.getTime() + (expiresIn - 5) * 60 * 1000,
    });
  });
});
