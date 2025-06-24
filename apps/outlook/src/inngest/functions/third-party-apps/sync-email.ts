import { inngest } from '@/inngest/client';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';
import { getOutlookMessage } from '../microsoft/get-message';

export type SyncEmailRequested = {
  'outlook/third_party_apps.email.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      messageId: string;
    };
  };
};

export const syncEmail = inngest.createFunction(
  {
    id: 'sync-outlook-email',
    concurrency: concurrencyOption,
    cancelOn: [
      {
        event: 'outlook/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'outlook/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'outlook/third_party_apps.email.sync.requested',
  },
  async ({ event, step }) => {
    const { organisationId, userId, messageId, region } = event.data;

    const message = await step.invoke('get-message', {
      function: getOutlookMessage,
      data: {
        userId,
        messageId,
        organisationId,
      },
      timeout: '3d',
    });

    if (!message) {
      return;
    }

    await step.sendEvent('analyze-email', {
      name: 'outlook/third_party_apps.email.analyze.requested',
      data: {
        organisationId,
        region,
        userId,
        message,
      },
    });
  }
);
