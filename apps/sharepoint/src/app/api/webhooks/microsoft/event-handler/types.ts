// import type { z } from 'zod';
// import type { incomingSubscriptionSchema } from '@/connectors/microsoft/subscription/subscriptions';
// import type { parsedSchema, resourcesSchema } from './service';

export type WebhookResponse<T> = {
  value: T[];
};

// export type ParsedType = z.infer<typeof parsedSchema>;

// export type SelectFieldsType = z.infer<typeof resourcesSchema>;
