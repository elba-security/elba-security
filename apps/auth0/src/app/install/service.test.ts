import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as auth from '@/connectors/auth';
import { registerOrganisation } from './service';

const now = new Date();
const region = 'us';
const clientId = 'test-client-id';
const clientSecret = 'test-client-secret';
const domain = 'test-domain';
const audience = 'test-audience';
const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  clientId,
  clientSecret,
  domain,
  audience,
  region,
};

describe('registerOrganisation', () => {
  beforeAll(() => {
    vi.setSystemTime(now);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  test('should setup organisation when the organisation id is valid and the organisation is not registered', async () => {
    const getTokenMock = vi.spyOn(auth, 'getToken').mockResolvedValue({
      access_token: 'access-token',
      expires_in: 'expiry-time',
      scope: 'scope',
      token_type: 'bearer',
    });

    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        clientId: organisation.clientId,
        clientSecret: organisation.clientSecret,
        audience: organisation.audience,
        domain: organisation.domain,
        region,
      })
    ).resolves.toBeUndefined();

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        clientId,
        clientSecret,
        audience,
        domain,
        region,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'auth0/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        region,
        syncStartedAt: Date.now(),
        page: 0,
      },
    });

    expect(getTokenMock).toBeCalledWith(clientId, clientSecret, audience, domain);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        clientId: organisation.clientId,
        clientSecret: organisation.clientSecret,
        audience: organisation.audience,
        domain: organisation.domain,
        region,
      })
    ).resolves.toBeUndefined();

    // check if the token in the database is updated
    await expect(
      db
        .select({
          clientId: Organisation.clientId,
          clientSecret: Organisation.clientSecret,
          audience: Organisation.audience,
          domain: Organisation.domain,
        })
        .from(Organisation)
        .where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        clientId,
        clientSecret,
        audience,
        domain,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith({
      name: 'auth0/users.page_sync.requested',
      data: {
        isFirstSync: true,
        organisationId: organisation.id,
        region,
        syncStartedAt: Date.now(),
        page: 0,
      },
    });
  });

  test('should not setup the organisation when the organisation id is invalid', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    const wrongId = 'xfdhg-dsf';
    const error = new Error(`invalid input syntax for type uuid: "${wrongId}"`);

    // assert that the function throws the mocked error
    await expect(
      registerOrganisation({
        organisationId: wrongId,
        clientId: organisation.clientId,
        clientSecret: organisation.clientSecret,
        audience: organisation.audience,
        domain: organisation.domain,
        region,
      })
    ).rejects.toThrowError(error);

    // ensure no organisation is added or updated in the database
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toHaveLength(0);

    // ensure no sync users event is sent
    expect(send).toBeCalledTimes(0);
  });
});
