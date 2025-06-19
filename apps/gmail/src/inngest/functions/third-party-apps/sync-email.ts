import { inngest } from '@/inngest/client';
import { getGmailMessage } from '../gmail/get-message';

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

    const { message } = await step.invoke('get-message', {
      function: getGmailMessage,
      data: {
        organisationId,
        userId,
        email,
        messageId,
      },
      timeout: '30d',
    });

    await step.sendEvent('analyze-email', {
      name: 'gmail/third_party_apps.email.analyze.requested',
      data: {
        organisationId,
        region,
        userId,
        email,
        message: {
          id: messageId,
          subject: message.subject,
          from: message.from,
          to: message.to,
          body: message.body,
        },
      },
    });
  }
);
