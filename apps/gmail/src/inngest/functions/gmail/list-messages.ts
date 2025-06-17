import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { listMessages } from '@/connectors/google/gmail';
import { inngest } from '@/inngest/client';

export type ListGmailMessagesRequested = {
  'gmail/gmail.message.list.requested': {
    data: {
      organisationId: string;
      userId: string;
      managerEmail: string;
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
    // Configuration shared with others gmail/ functions
    // Google documentation https://developers.google.com/workspace/gmail/api/reference/quota
    // API rate limit bottleneck is per user: 15,000 quotas
    // messages.list is 5 quotas for 500 messages
    // messages.get is 5 quotas
    //
    // We can split quotas in order to maximize speed (with a thin margin of error: 20 quotas):
    //   - 6 calls per second for messages.list: 30 quotas
    //   - 2990 calls per second for messages.get: 14950 quotas
    throttle: {
      key: 'event.data.userId',
      limit: 6,
      period: '1s',
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
    const { managerEmail, email, pageToken, q } = event.data;

    const authClient = await getGoogleServiceAccountClient(managerEmail);

    const result = await listMessages({
      auth: authClient,
      userId: email,
      pageToken: pageToken ?? undefined,
      q,
    });

    return result;
  }
);
