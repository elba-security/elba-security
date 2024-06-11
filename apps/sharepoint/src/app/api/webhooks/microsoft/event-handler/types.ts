import type { z } from 'zod';
import type { incomingSubscriptionSchema } from '@/connectors/microsoft/subscription/subscriptions';
import type { parsedSchema, resourcesSchema } from './service';

export type SubscriptionPayload = z.infer<typeof incomingSubscriptionSchema>;

export type WebhookResponse<T> = {
  value: T[];
};

export type ParsedType = z.infer<typeof parsedSchema>;

export type SelectFieldsType = z.infer<typeof resourcesSchema>;

export type UpdateItemsData = {
  id: string;
  name: 'sharepoint/update-items.triggered';
  data: {
    siteId: string;
    driveId: string;
    subscriptionId: string;
    tenantId: string;
    skipToken: null | string;
  };
};
