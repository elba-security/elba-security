import { inngest } from '@/inngest/client';
import { getMessages } from '@/connectors/microsoft/message';
import { MicrosoftError } from '@/connectors/microsoft/common/error';
import { type OutlookMessage } from '@/connectors/microsoft/types';
import { getToken } from '@/connectors/microsoft/auth';

export type ListOutlookMessagesRequested = {
  'outlook/outlook.messages.list.requested': {
    data: {
      organisationId: string;
      userId: string;
      skipStep: string | null;
      filter: string;
      tenantId: string;
    };
  };
};

export const listOutlookMessages = inngest.createFunction(
  {
    id: 'list-outlook-messages',
    // https://learn.microsoft.com/en-us/graph/throttling-limits#outlook-service-limits
    // Outlook applies limit to a pair of app and mailbox (user)
    // 4 concurrent requests
    // 10,000 requests per 10 minutes (we are using 9_000 to be slightly under the rate limit)
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
    event: 'outlook/outlook.messages.list.requested',
  },
  async ({ event }) => {
    try {
      const { skipStep, userId, filter, tenantId } = event.data;

      const { token } = await getToken(tenantId);

      return await getMessages({
        filter,
        userId,
        skipStep,
        token,
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
