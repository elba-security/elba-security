import { expect, test, describe, vi } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import * as authConnector from '@/connectors/azuredevops/auth';
import { encrypt, decrypt } from '@/common/crypto';
import { AzuredevopsError } from '@/connectors/common/error';
import { refreshToken } from './refresh-token';

const newTokens = {
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

const encryptedTokens = {
  accessToken: await encrypt(newTokens.accessToken),
  refreshToken: await encrypt(newTokens.refreshToken),
};

const organisation = {
  id: '00000000-0000-0000-0000-000000000001',
  accessToken: encryptedTokens.accessToken,
  refreshToken: encryptedTokens.refreshToken,
  region: 'us',
  authUserEmail: 'test@gmail.com',
  workspaceId: 'some-workspace-id',
};

// next token duration
const expiresIn = '6000';

const setup = createInngestFunctionMock(refreshToken, 'azuredevops/token.refresh.requested');

describe('refresh-token', () => {
  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(authConnector, 'getRefreshToken').mockResolvedValue({
      ...newTokens,
      expiresIn,
    });

    const [result] = setup({ organisationId: organisation.id });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(authConnector.getRefreshToken).toBeCalledTimes(0);
  });

  test('should update encrypted tokens and schedule the next refresh', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(authConnector, 'getRefreshToken').mockResolvedValue({
      ...newTokens,
      expiresIn,
    });

    const [result] = setup({ organisationId: organisation.id });

    await expect(result).resolves.toBe(undefined);

    const [updatedOrganisation] = await db
      .select({
        accessToken: organisationsTable.accessToken,
        refreshToken: organisationsTable.refreshToken,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!updatedOrganisation) {
      throw new AzuredevopsError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(updatedOrganisation.refreshToken)).resolves.toEqual(
      newTokens.refreshToken
    );

    expect(authConnector.getRefreshToken).toBeCalledTimes(1);
    expect(authConnector.getRefreshToken).toBeCalledWith(newTokens.refreshToken);
  });
});
