import { EventSchemas } from 'inngest';

export const elbaEvents = new EventSchemas().fromRecord<{
  'app.installed': {
    data: {
      organisationId: string;
    };
  };
  'app.uninstalled': {
    data: {
      organisationId: string;
    };
  };
  'users.sync.requested': {
    data: {
      organisationId: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      cursor: string | null;
    };
  };
  'third_party_apps.sync.requested': {
    data: {
      organisationId: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      cursor: string | null;
    };
  };
  'data_protection.sync.requested': {
    data: {
      organisationId: string;
      isFirstSync: boolean;
      syncStartedAt: number;
      cursor: string | null;
    };
  };
  'token.refresh.requested': {
    data: {
      organisationId: string;
      expiresAt: number;
    };
  };
}>();

export type ElbaEventsRecord = typeof elbaEvents extends EventSchemas<infer R> ? R : never;
