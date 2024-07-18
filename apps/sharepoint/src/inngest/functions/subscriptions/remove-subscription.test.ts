import { expect, test, describe, vi, beforeEach } from 'vitest';
import { createInngestFunctionMock } from '@elba-security/test-utils';
import { NonRetriableError } from 'inngest';
import * as removeSubscriptionConnector from '@/connectors/microsoft/subscriptions/subscriptions';
import { organisationsTable, sharePointTable } from '@/database/schema';
import { encrypt } from '@/common/crypto';
import { db } from '@/database/client';
import { removeSubscription } from './remove-subscription';

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
  subscriptionExpirationDate: '2024-04-25 00:00:00.000000',
  subscriptionClientState: clientState,
  delta: deltaToken,
};

const setupData = {
  subscriptionId: sharePoint.subscriptionId,
  organisationId: organisation.id,
};

const setup = createInngestFunctionMock(
  removeSubscription,
  'sharepoint/subscriptions.remove.triggered'
);

describe('remove-subscription', () => {
  beforeEach(async () => {
    await db.insert(organisationsTable).values(organisation);
    await db
      .insert(sharePointTable)
      .values(sharePoint)
      .onConflictDoUpdate({
        target: [sharePointTable.organisationId, sharePointTable.driveId],

        set: {
          subscriptionId: sharePoint.subscriptionId,
          subscriptionExpirationDate: sharePoint.subscriptionExpirationDate,
          subscriptionClientState: sharePoint.subscriptionClientState,
          delta: sharePoint.delta,
        },
      });
  });

  test('should abort removing when record not found', async () => {
    vi.spyOn(removeSubscriptionConnector, 'removeSubscription').mockResolvedValue(undefined);

    const [result, { step }] = setup({
      ...setupData,
      organisationId: '15a76301-f1dd-4a77-b12a-9d7d3fca3c92', // fake id
    });

    await expect(result).rejects.toBeInstanceOf(NonRetriableError);

    expect(removeSubscriptionConnector.removeSubscription).toBeCalledTimes(0);
    expect(step.sendEvent).toBeCalledTimes(0);
  });

  test('should run removeSubscription when data is valid', async () => {
    vi.spyOn(removeSubscriptionConnector, 'removeSubscription').mockResolvedValue(undefined);

    const [result, { step }] = setup(setupData);

    await expect(result).resolves.toBeUndefined();

    expect(removeSubscriptionConnector.removeSubscription).toBeCalledTimes(1);
    expect(removeSubscriptionConnector.removeSubscription).toBeCalledWith({
      subscriptionId: 'some-subscription-id',
      token: 'test-token',
    });

    expect(step.sendEvent).toBeCalledTimes(1);
    expect(step.sendEvent).toBeCalledWith('remove-subscription-completed', {
      name: 'sharepoint/subscriptions.remove.completed',
      data: {
        subscriptionId,
        organisationId,
      },
    });
  });
});
