import { type infer as zInfer, type ZodSchema } from 'zod';
import {
  authenticationRefreshObjectRequestedWebhookDataSchema,
  dataProtectionContentRequestedWebhookDataSchema,
  dataProtectionDeleteObjectPermissionsRequestedDataSchema,
  dataProtectionObjectDeletedWebhookDataSchema,
  dataProtectionRefreshObjectRequestedWebhookDataSchema,
  dataProtectionStartSyncRequestedWebhookDataSchema,
  thirdPartyAppsDeleteObjectRequestedWebhookDataSchema,
  thirdPartyAppsRefreshObjectRequestedWebhookDataSchema,
  thirdPartyAppsStartSyncRequestedWebhookDataSchema,
  usersDeleteUserRequestedWebhookDataSchema,
} from '@elba-security/schemas';
import { ElbaError } from '../error';

const eventDataSchema = {
  'authentication.refresh_object_requested': authenticationRefreshObjectRequestedWebhookDataSchema,
  'data_protection.content_requested': dataProtectionContentRequestedWebhookDataSchema,
  'data_protection.delete_object_permissions_requested':
    dataProtectionDeleteObjectPermissionsRequestedDataSchema,
  'data_protection.object_deleted': dataProtectionObjectDeletedWebhookDataSchema,
  'data_protection.refresh_object_requested': dataProtectionRefreshObjectRequestedWebhookDataSchema,
  'data_protection.start_sync_requested': dataProtectionStartSyncRequestedWebhookDataSchema,
  'third_party_apps.delete_object_requested': thirdPartyAppsDeleteObjectRequestedWebhookDataSchema,
  'third_party_apps.refresh_object_requested':
    thirdPartyAppsRefreshObjectRequestedWebhookDataSchema,
  'third_party_apps.start_sync_requested': thirdPartyAppsStartSyncRequestedWebhookDataSchema,
  'users.delete_user_requested': usersDeleteUserRequestedWebhookDataSchema,
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
