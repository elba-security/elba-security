import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import type { IncomingSubscription } from '@/connectors/microsoft/subscriptions/subscriptions';

export const handleWebhook = async (data: IncomingSubscription[]) => {
  if (!data.length) {
    return;
  }

  const drives: { subscriptionId: string; tenantId: string; siteId: string; driveId: string }[] =
    [];
  for (const payload of data) {
    const parsedResourceName = /sites\/(?<siteId>[^/]+)\/drives\/(?<driveId>[^/]+)/.exec(
      payload.resource
    );
    const { siteId, driveId } = parsedResourceName?.groups || {};
    if (!siteId || !driveId) {
      logger.error('Failed to parse resource name', { resource: payload.resource });
      continue;
    }
    // if (!parsed.success) {
    //   logger.error('parseResourceString Error', { resource: payload.resource, selectFields });
    //   continue;
    // }

    drives.push({
      subscriptionId: payload.subscriptionId,
      tenantId: payload.tenantId,
      siteId,
      driveId,
    });
  }

  if (drives.length) {
    await inngest.send(
      drives.map((drive) => ({
        name: 'sharepoint/update-items.triggered',
        data: {
          siteId: drive.siteId,
          driveId: drive.driveId,
          subscriptionId: drive.subscriptionId,
          tenantId: drive.tenantId,
          skipToken: null,
        },
      }))
    );
  }
};
