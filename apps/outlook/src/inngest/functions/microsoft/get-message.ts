import { inngest } from '@/inngest/client';
import { getMessage } from '@/connectors/microsoft/message';
import { decrypt } from '@/common/crypto';
import { getToken } from '@/inngest/functions/common/get-token';
import { MicrosoftError } from '@/connectors/microsoft/common/error';

export type GetOutlookMessageRequested = {
  'outlook/outlook.message.requested': {
    data: {
      organisationId: string;
      userId: string;
      messageId: string;
    };
  };
};

export const getOutlookMessage = inngest.createFunction(
  {
    id: 'get-outlook-message',
    // https://learn.microsoft.com/en-us/graph/throttling-limits#outlook-service-limits
    // Outlook applies limit to a pair of app and mailbox (user)
    // 4 concurrent requests
    // 10,000 requests per 10 minutes
    // But this rate limit shared between getOutlookMessage and listOutlookMessages
    concurrency: {
      key: 'event.data.userId',
      limit: 4,
    },
    throttle: {
      key: 'event.data.userId',
      limit: 9_000,
      period: '10m',
    },
  },
  {
    event: 'outlook/outlook.message.requested',
  },
  async ({ event, step }) => {
    try {
      const { userId, messageId, organisationId } = event.data;

      const token = await step.invoke('get-token', {
        function: getToken,
        data: {
          organisationId,
        },
        timeout: '1d',
      });

      return await getMessage({
        userId,
        messageId,
        token: await decrypt(token),
      });
    } catch (e) {
      if (e instanceof MicrosoftError) {
        return null;
      }
      throw e;
    }
  }
);
