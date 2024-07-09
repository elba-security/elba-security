import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { organisationsTable } from '@/database/schema';
import { encrypt, decrypt } from '@/common/crypto';
import * as authConnector from '@/connectors/auth';
import * as tokenGenerator from '@/common/jwt';
import { TableauError } from '@/connectors/commons/error';
import { refreshToken } from './refresh-token';

const newToken = 'new-token';

const credentials = {
  site: {
    id: 'site-id',
    contentUrl: 'content-url',
  },
  user: {
    id: 'user-id',
  },
  token: newToken,
};

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c90',
  token: await encrypt('test-token'),
  clientId: 'client-id',
  secretId: 'secret-id',
  domain: 'test.tableau.com',
  siteId: 'site-id',
  email: 'test@test.com',
  secret: await encrypt('secret'),
  region: 'us',
  contentUrl: 'content-url',
};
const now = new Date();
// current token expires in an hour
const expiresAt = now.getTime() + 60 * 1000;
// next token duration
const expiresIn = 60 * 1000;

const setup = createInngestFunctionMock(refreshToken, 'tableau/token.refresh.requested');

describe('refresh-token', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should abort sync when organisation is not registered', async () => {
    vi.spyOn(authConnector, 'authenticate').mockResolvedValue({
      credentials,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(authConnector.authenticate).toBeCalledTimes(0);

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  authConnector.getTokenExpirationTimestamp;
  test('should update encrypted tokens and schedule the next refresh', async () => {
    await db.insert(organisationsTable).values(organisation);

    vi.spyOn(tokenGenerator, 'generateToken').mockResolvedValue('new-token');

    vi.spyOn(authConnector, 'getTokenExpirationTimestamp').mockResolvedValue(
      now.getTime() + expiresIn * 1000
    );

    vi.spyOn(authConnector, 'authenticate').mockResolvedValue({
      credentials,
    });

    const [result, { step }] = setup({
      organisationId: organisation.id,
      expiresAt,
    });

    await expect(result).resolves.toBe(undefined);

    const [updatedOrganisation] = await db
      .select({
        token: organisationsTable.token,
      })
      .from(organisationsTable)
      .where(eq(organisationsTable.id, organisation.id));
    if (!updatedOrganisation) {
      throw new TableauError(`Organisation with ID ${organisation.id} not found.`);
    }
    await expect(decrypt(updatedOrganisation.token)).resolves.toEqual(newToken);

    expect(authConnector.authenticate).toBeCalledTimes(1);
    expect(authConnector.authenticate).toBeCalledWith({
      token: newToken,
      domain: organisation.domain,
      contentUrl: organisation.contentUrl,
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('next-refresh', {
      name: 'tableau/token.refresh.requested',
      data: {
        organisationId: organisation.id,
        expiresAt: now.getTime() + expiresIn * 1000,
      },
    });
  });
});
