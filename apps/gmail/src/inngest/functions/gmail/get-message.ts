import { encryptText } from '@elba-security/utils';
import { getGoogleServiceAccountClient } from '@/connectors/google/clients';
import { getMessage } from '@/connectors/google/gmail';
import { inngest } from '@/inngest/client';
import { env } from '@/common/env/server';
import { encryptElbaInngestText } from '@/common/crypto';
import { concurrencyOption } from '../common/concurrency-option';

/**
 * Encrypt sensitive data for runLlm function runs
 */
export const encrypt = (data: string) => {
  return encryptText({
    data,
    key: env.ELBA_INNGEST_ENCRYPTION_KEY,
    iv: '7e8c2f9a1b0d6e3c5a4f8b1d9c0e7a3b',
  });
};

export type GetGmailMessageRequested = {
  'gmail/gmail.message.get.requested': {
    data: {
      organisationId: string;
      userId: string;
      // specific to the api
      email: string;
      messageId: string;
    };
  };
};

export const getGmailMessage = inngest.createFunction(
  {
    id: 'get-gmail-message',
    concurrency: concurrencyOption,
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
      // Use a greater margin of error (rate limit issues are still visible with higher limit)
      limit: 2500,
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
    event: 'gmail/gmail.message.get.requested',
  },
  async ({ event }) => {
    const { email, messageId } = event.data;

    const authClient = await getGoogleServiceAccountClient(email);

    const result = await getMessage({
      auth: authClient,
      userId: email,
      id: messageId,
    });

    if (result.error) {
      return {
        error: result.error,
      };
    }

    return {
      message: {
        from: await encryptElbaInngestText(result.message.from),
        to: await encryptElbaInngestText(result.message.to),
        subject: await encryptElbaInngestText(result.message.subject),
        body: await encryptElbaInngestText(result.message.body),
      },
    };
  }
);
