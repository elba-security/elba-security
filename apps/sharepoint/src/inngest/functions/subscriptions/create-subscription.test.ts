import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as createSubscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, subscriptionsTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { createSubscription } from './create-subscription';

const token = 'test-token';
const organisationId = '45a76301-f1dd-4a77-b12f-9d7d3fca3c90';
const siteId = 'some-site-id';
const driveId = 'some-drive-id';
const subscriptionId = 'some-subscription-id';
const tenantId = 'some-tenant-id';
const deltaToken = 'some-delta-token';
const clientState = 'some-client-state';

const organisation = {
  id: organisationId,
  token: await encrypt(token),
  tenantId,
  region: 'us',
};

const sharePoint = {
  organisationId,
  siteId,
  driveId,
  subscriptionId,
  subscriptionClientState: clientState,
  subscriptionExpirationDate: '2024-04-25 00:00:00.000000',
  delta: deltaToken,
};

const setupData = {
  organisationId: organisation.id,
  siteId,
  driveId,
  isFirstSync: false,
};

const subscription = {
  id: subscriptionId,
  clientState,
  expirationDateTime: sharePoint.subscriptionExpirationDate,
};

const setup = createInngestFunctionMock(
  createSubscription,
  'sharepoint/subscriptions.create.triggered'
);

describe('create-subscription', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
    await db
      .insert(subscriptionsTable)
      .values(sharePoint)
      .onConflictDoUpdate({
        target: [subscriptionsTable.organisationId, subscriptionsTable.driveId],

        set: {
          subscriptionId: sharePoint.subscriptionId,
          subscriptionExpirationDate: sharePoint.subscriptionExpirationDate,
          subscriptionClientState: sharePoint.subscriptionClientState,
          delta: sharePoint.delta,
        },
      });
  });

  test('should abort subscribing when record not found', async () => {
    vi.spyOn(createSubscriptionConnector, 'createSubscription').mockResolvedValue(subscription);

    const [result] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(createSubscriptionConnector.createSubscription).toBeCalledTimes(0);
  });

  test('should run createSubscription when data is valid', async () => {
    const changeType = 'updated';
    const resource = `sites/${siteId}/drives/${driveId}/root`;

    vi.spyOn(createSubscriptionConnector, 'createSubscription').mockResolvedValue(subscription);

    const [result] = setup(setupData);

    await expect(result).resolves.toStrictEqual(subscription);

    expect(createSubscriptionConnector.createSubscription).toBeCalledTimes(1);
    expect(createSubscriptionConnector.createSubscription).toBeCalledWith(
      expect.objectContaining({
        token,
        changeType,
        resource,
      })
    );
  });
});
