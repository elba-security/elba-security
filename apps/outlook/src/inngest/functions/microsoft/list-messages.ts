import { inngest } from '@/inngest/client';
import { getMessages, type OutlookMessage } from '@/connectors/microsoft/message';
import { decrypt } from '@/common/crypto';
import { MicrosoftError } from '@/connectors/microsoft/common/error';
import { getToken } from '@/inngest/functions/common/get-token';

export type ListOutlookMessagesRequested = {
  'outlook/outlook.message.list.requested': {
    data: {
      organisationId: string;
      userId: string;
      skipStep: string | null;
      filter: string;
    };
  };
};

export const listOutlookMessages = inngest.createFunction(
  {
    id: 'list-outlook-messages',
    // https://learn.microsoft.com/en-us/graph/throttling-limits#outlook-service-limits
    // Outlook applies limit to a pair of app and mailbox (user)
    // 4 concurrent requests
    // 10000 requests per 10 minutes
    concurrency: {
      key: 'event.data.userId',
      limit: 4,
    },
    throttle: {
      key: 'event.data.userId',
      limit: 10_000,
      period: '10m',
    },
  },
  {
    event: 'outlook/outlook.message.list.requested',
  },
  async ({ event, step }) => {
    try {
      const { skipStep, userId, filter, organisationId } = event.data;

      const token = await step.invoke('get-token', {
        function: getToken,
        data: {
          organisationId,
        },
        timeout: '1d',
      });

      return await getMessages({
        filter,
        userId,
        skipStep,
        token: await decrypt(token),
      });
    } catch (e) {
      // If a user doesn't have a license for Outlook
      if (e instanceof MicrosoftError && e.response?.status === 404) {
        return {
          messages: [] as OutlookMessage[],
          nextSkip: null,
          status: 'skip',
        };
      }
      throw e;
    }
  }
);
