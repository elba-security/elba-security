import { scheduleDataProtectionSync } from './schedule-data-protection-sync';

type DataProtectionSyncCancelEvent = {
  'slack/sync.cancel': {
    data: {
      organisationId: string;
    };
  };
};

export type DataProtectionEvents = DataProtectionSyncCancelEvent;

export const dataProtectionFunctions = [scheduleDataProtectionSync];
