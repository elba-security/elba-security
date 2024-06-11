import { expect, test, describe, vi, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import * as crypto from '@/common/crypto';
import { db } from '@/database/client';
import { Organisation } from '@/database/schema';
import { inngest } from '@/inngest/client';
import * as userConnector from '@/connectors/users';
import { encrypt } from '@/common/crypto';
import { registerOrganisation } from './service';

const token = 'testkey';
const region = 'us';
const now = new Date();

const organisation = {
  id: '45a76301-f1dd-4a77-b12f-9d7d3fca3c99',
  token,
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
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(token);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        region,
      })
    ).resolves.toBeUndefined();
    const encryptToken = await encrypt(token);

    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token: encryptToken,
        region,
      },
    ]);

    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'yousign/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'yousign/yousign.elba_app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });

  test('should setup organisation when the organisation id is valid and the organisation is already registered', async () => {
    // @ts-expect-error -- this is a mock
    const send = vi.spyOn(inngest, 'send').mockResolvedValue(undefined);
    vi.spyOn(crypto, 'encrypt').mockResolvedValue(token);

    // mocked the getUsers function
    // @ts-expect-error -- this is a mock
    vi.spyOn(userConnector, 'getUsers').mockResolvedValue(undefined);
    // pre-insert an organisation to simulate an existing entry
    await db.insert(Organisation).values(organisation);

    await expect(
      registerOrganisation({
        organisationId: organisation.id,
        token,
        region,
      })
    ).resolves.toBeUndefined();
    expect(crypto.encrypt).toBeCalledTimes(1);
    const encryptToken = await encrypt(token);

    // check if the token in the database is updated
    await expect(
      db.select().from(Organisation).where(eq(Organisation.id, organisation.id))
    ).resolves.toMatchObject([
      {
        token: encryptToken,
      },
    ]);

    // verify that the user/sync event is sent
    expect(send).toBeCalledTimes(1);
    expect(send).toBeCalledWith([
      {
        name: 'yousign/users.sync.requested',
        data: {
          isFirstSync: true,
          organisationId: organisation.id,
          syncStartedAt: now.getTime(),
          page: null,
        },
      },
      {
        name: 'yousign/yousign.elba_app.installed',
        data: {
          organisationId: organisation.id,
          region,
        },
      },
    ]);
  });
});
