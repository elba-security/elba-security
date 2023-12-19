import { type infer as zInfer, type ZodSchema } from 'zod';
import {
  dataProtectionContentRequestedDataSchema,
  dataProtectionScanTriggeredWebhookDataSchema,
  thirdPartyAppsScanTriggeredWebhookDataSchema,
} from '@elba-security/schemas';
import { ElbaError } from '../error';

const eventDataSchema = {
  'third_party_apps.scan_triggered': thirdPartyAppsScanTriggeredWebhookDataSchema,
  'data_protection.scan_triggered': dataProtectionScanTriggeredWebhookDataSchema,
  'data_protection.content_requested': dataProtectionContentRequestedDataSchema,
} as const satisfies Record<string, ZodSchema>;

export type WebhookEvent = keyof typeof eventDataSchema;

export const parseWebhookEventData = <T extends WebhookEvent>(
  event: T,
  data: unknown
): zInfer<(typeof eventDataSchema)[T]> => {
  const eventDataParseResult = eventDataSchema[event].safeParse(formatData(data));

  if (!eventDataParseResult.success) {
    throw new ElbaError('Could not validate webhook event data', {
      cause: eventDataParseResult.error,
    });
  }

  return eventDataParseResult.data;
};

const formatData = (data: unknown) => {
  if (data instanceof URLSearchParams) {
    return Object.fromEntries(data.entries());
  }
  return data;
};
