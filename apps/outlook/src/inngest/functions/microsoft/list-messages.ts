import { shouldAnalyzeEmail } from '@elba-security/utils';
import { encryptElbaInngestText } from '@/common/crypto';
import { inngest } from '@/inngest/client';
import { getMessages } from '@/connectors/microsoft/message';
import { MicrosoftError } from '@/connectors/microsoft/common/error';
import { type OutlookMessage } from '@/connectors/microsoft/types';
import { getToken } from '@/connectors/microsoft/auth';

export type ListOutlookMessagesRequested = {
  'outlook/outlook.messages.list.requested': {
    data: {
      organisationId: string;
      mail: string | null;
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
      const { skipStep, userId, filter, tenantId, mail } = event.data;

      const { token } = await getToken(tenantId);

      const result = await getMessages({
        filter,
        userId,
        skipStep,
        token,
      });

      const senders = new Set<string>();
      const filteredMessages: OutlookMessage[] = [];

      for (const message of result.messages) {
        if (
          !senders.has(message.from) &&
          shouldAnalyzeEmail({ sender: message.from, receiver: mail ?? '' })
        ) {
          filteredMessages.push(message);
          senders.add(message.from);
        }
      }

      const encryptedMessages = await Promise.all(
        filteredMessages.map(async (message) => ({
          id: message.id,
          subject: await encryptElbaInngestText(message.subject),
          from: await encryptElbaInngestText(message.from),
          toRecipients: await encryptElbaInngestText(message.toRecipients),
          body: await encryptElbaInngestText(message.body),
        }))
      );

      return { nextSkip: result.nextSkip, messages: encryptedMessages };
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
