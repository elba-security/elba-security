import type { z } from 'zod';
import type { subscriptionSchema } from '@/app/api/webhooks/microsoft/event-handler/route';
import type { parsedSchema, resoursesSchema } from './service';

export type SubscriptionPayload = z.infer<typeof subscriptionSchema>;

export type WebhookResponse<T> = {
  value: T[];
};

export type ParsedType = z.infer<typeof parsedSchema>;

export type SelectFieldsType = z.infer<typeof resoursesSchema>;

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
