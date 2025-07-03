import { GaxiosError } from 'googleapis-common';
import { z } from 'zod';
import { RetryAfterError } from 'inngest';
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
    // API rate limit is 1_200_000 per minute for our elba gmail app
    // caller function is handling rate limit per user
    //
    // messages.list is 5 quotas for 100 messages
    // messages.get is 5 quotas
    //
    // For each call we are going to use 505 quotas
    // with 2000 calls per minute we will use 1_010_000 quotas; keeping a safety margin
    throttle: {
      limit: 2000,
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

    try {
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
    } catch (error) {
      // Despite we respect per user rate-limit, Gmail API can still returns rate-limit error
      if (error instanceof GaxiosError && error.response?.headers['retry-after']) {
        const rawRetryAfter = error.response.headers['retry-after'] as unknown;
        const retryAfterInSecondsResult = z.coerce.number().safeParse(rawRetryAfter);
        const retryAfterInDateResult = z.coerce.date().safeParse(rawRetryAfter);
        let retryAfter: string | Date = '60s';

        if (retryAfterInSecondsResult.success) {
          retryAfter = `${retryAfterInSecondsResult.data}s`;
        } else if (retryAfterInDateResult.success) {
          retryAfter = retryAfterInDateResult.data;
        }

        throw new RetryAfterError(`Gmail API rate limit reached: ${error.message}`, retryAfter);
      }
      throw error;
    }
  }
);
