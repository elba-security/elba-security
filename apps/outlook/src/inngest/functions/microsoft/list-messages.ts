import { inngest } from '@/inngest/client';
import { getMessages, type OutlookMessage } from '@/connectors/microsoft/message';
import { decrypt } from '@/common/crypto';
import { MicrosoftError } from '@/connectors/microsoft/common/error';

export type ListOutlookMessagesRequested = {
  'outlook/outlook.message.list.requested': {
    data: {
      organisationId: string;
      userId: string;
      skipStep: string | null;
      token: string;
      filter: string;
    };
  };
};

export const listOutlookMessages = inngest.createFunction(
  {
    id: 'list-outlook-messages',
    throttle: {
      key: 'event.data.userId',
      limit: 6,
      period: '1s',
    },
  },
  {
    event: 'outlook/outlook.message.list.requested',
  },
  async ({ event }) => {
    try {
      const { skipStep, token, userId, filter } = event.data;
      const result = await getMessages({
        filter,
        userId,
        skipStep,
        token: await decrypt(token),
      });

      return result;
    } catch (e) {
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
