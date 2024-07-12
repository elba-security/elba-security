import { z } from 'zod';
import { logger } from '@elba-security/logger';
import { inngest } from '@/inngest/client';
import { type IncomingSubscription } from '@/connectors/microsoft/subscription/subscriptions';
// import type { ParsedType } from './types';

export const parsedResourceSchema = z.object({
  siteId: z.string().min(1),
  driveId: z.string().min(1),
});

// type ParsedType = z.infer<typeof parsedResourceSchema>;

// type ParsedResouse = z.infer<typeof parsedResourceSchema>;

// export const selectFields = {
//   sites: 'siteId',
//   drives: 'driveId',
// };

// export const parseResourceString = (resource: string) => {
//   const dataArray = resource.split('/');
//   const keys = Object.keys(selectFields);

//   const result = keys.reduce<ParsedType>(
//     (acc, el) => {
//       const index = dataArray.indexOf(el);

//       if (index >= 0) {
//         // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- temp
//         acc[selectFields[el]] = dataArray[index + 1];
//       }

//       return acc;
//     },
//     { siteId: '', driveId: '' }
//   );

//   return parsedResourceSchema.safeParse(result);
// };

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
        // id: `update-items-subscription-${drive.subscriptionId}`, // WHY???? // TODO: remove this
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
