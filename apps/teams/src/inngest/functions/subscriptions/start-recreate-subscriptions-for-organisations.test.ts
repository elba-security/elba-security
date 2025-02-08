import { createInngestFunctionMock } from '@elba-security/test-utils';
import { describe, expect, test } from 'vitest';
import { encrypt } from '@/common/crypto';
import { startRecreateSubscriptionsForOrganisations } from '@/inngest/functions/subscriptions/start-recreate-subscriptions-for-organisations';
import { organisationsTable } from '@/database/schema';
import { db } from '@/database/client';

const token = 'token';
const encryptedToken = await encrypt(token);
const organisationId = '12449650-9738-4a9c-8db0-1e4ef5a6a9e8';
const tenantId = 'tenant-id';
const organisations = [
  {
    id: organisationId,
    tenantId,
    region: 'us',
    token: encryptedToken,
  },
  {
    id: '92449650-9738-4a9c-8db0-1e4ef5a6a9e8',
    tenantId,
    region: 'eu',
    token: encryptedToken,
  },
];

const setup = createInngestFunctionMock(
  startRecreateSubscriptionsForOrganisations,
  'teams/subscriptions.start-recreate.requested'
);

describe('startReconnectSubscriptions', () => {
  test('should start subscriptions reconnection if have no organisations', async () => {
    const [result, { step }] = setup({});

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should start subscriptions reconnection for all configured tenants', async () => {
    await db.insert(organisationsTable).values(organisations);

    const [result, { step }] = setup({});

    await expect(result).resolves.toBeUndefined();

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('recreate-subscriptions', [
      {
        name: 'teams/subscriptions.recreate.requested',
        data: {
          organisationId,
          tenantId,
        },
      },
    ]);
  });
});
