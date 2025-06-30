import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { listMessages } from '@/connectors/google/gmail';
import { inngest } from '@/inngest/client';
import { encryptElbaInngestText } from '@/common/crypto';
import { concurrencyOption } from '../common/concurrency-option';

export type ListGmailMessagesRequested = {
  'gmail/gmail.message.list.requested': {
    data: {
      organisationId: string;
      userId: string;
      // specific to the api
      email: string;
      pageToken?: string | null;
      q?: string; // example: "after:1748426400 before:..."" (timestamp in seconds)
    };
  };
};

export const listGmailMessages = inngest.createFunction(
  {
    id: 'list-gmail-messages',
    concurrency: concurrencyOption,
    // Configuration shared with others gmail/ functions
    // Google documentation https://developers.google.com/workspace/gmail/api/reference/quota
    // API rate limit bottleneck is per user: 15,000 quotas
    // messages.list is 5 quotas for 100 messages
    // messages.get is 5 quotas
    //
    // For each call we are going to use 505 quotas
    // with 25 calls per minute we will use 12625 quotas; keeping a safety margin
    throttle: {
      key: 'event.data.userId',
      limit: 25,
      period: '60s',
    },
    cancelOn: [
      {
        event: 'gmail/sync.cancelled',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'gmail/gmail.message.list.requested',
  },
  async ({ event }) => {
    const { email, pageToken, q } = event.data;

    const authClient = await getGoogleServiceAccountClient(email);

    const result = await listMessages({
      auth: authClient,
      userId: email,
      pageToken: pageToken ?? undefined,
      q,
    });

    return {
      ...result,
      messages: await Promise.all(
        result.messages.map(async (message) => ({
          id: message.id,
          from: await encryptElbaInngestText(message.from),
          to: await encryptElbaInngestText(message.to),
          subject: await encryptElbaInngestText(message.subject),
          body: await encryptElbaInngestText(message.body),
        }))
      ),
    };
  }
);
