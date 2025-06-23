import { inngest } from '@/inngest/client';
import { getGmailMessage } from '../gmail/get-message';
import { concurrencyOption } from '../common/concurrency-option';

export type SyncEmailRequested = {
  'gmail/third_party_apps.email.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      email: string;
      messageId: string;
    };
  };
};

export const syncEmail = inngest.createFunction(
  {
    id: 'sync-email',
    concurrency: concurrencyOption,
    cancelOn: [
      {
        event: 'gmail/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'gmail/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
      {
        event: 'gmail/sync.cancelled',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'gmail/third_party_apps.email.sync.requested',
  },
  async ({ event, step }) => {
    const { email, messageId, organisationId, userId, region } = event.data;

    const result = await step.invoke('get-message', {
      function: getGmailMessage,
      data: {
        organisationId,
        userId,
        email,
        messageId,
      },
      timeout: '30d',
    });

    if ('error' in result) {
      return {
        error: result.error,
      };
    }

    await step.sendEvent('analyze-email', {
      name: 'gmail/third_party_apps.email.analyze.requested',
      data: {
        organisationId,
        region,
        userId,
        email,
        message: {
          id: messageId,
          subject: result.message.subject,
          from: result.message.from,
          to: result.message.to,
          body: result.message.body,
        },
      },
    });
  }
);
