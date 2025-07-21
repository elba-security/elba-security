import { shouldAnalyzeEmail } from '@elba-security/utils';
import { inngest } from '@/inngest/client';
import { formatListMessagesQuery, type GmailMessage } from '@/connectors/google/gmail';
import { env } from '@/common/env/server';
import { decryptElbaInngestText } from '@/common/crypto';
import { listGmailMessages } from '../gmail/list-messages';
import { concurrencyOption } from '../common/concurrency-option';

export type SyncInboxRequested = {
  'gmail/third_party_apps.inbox.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      email: string;
      pageToken: string | null; // google /emails pageToken
      syncFrom: string | null;
      syncTo: string;
      syncStartedAt: string;
      syncedEmailsCount?: number;
    };
  };
};

export const syncInbox = inngest.createFunction(
  {
    id: 'sync-inbox',
    concurrency: concurrencyOption,
    // Configuration shared with others gmail/ functions
    // Google documentation https://developers.google.com/workspace/gmail/api/reference/quota
    // API rate limit bottleneck is per user: 15_000 quotas per minute
    // listGmailMessages is 505 quotas
    //
    // with 25 calls per minute we will use 12625 quotas; keeping a safety margin
    throttle: {
      key: 'event.data.userId',
      limit: 25,
      period: '60s',
    },
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
    event: 'gmail/third_party_apps.inbox.sync.requested',
  },
  async ({ event, step }) => {
    const {
      email,
      pageToken,
      organisationId,
      userId,
      region,
      syncFrom,
      syncTo,
      syncStartedAt,
      syncedEmailsCount = 0,
    } = event.data;

    const { messages, nextPageToken } = await step.invoke('list-messages', {
      function: listGmailMessages,
      data: {
        organisationId,
        userId,
        email,
        pageToken,
        q: formatListMessagesQuery({
          '-is': ['chat', 'draft', 'scheduled'],
          '-in': ['trash', 'spam', 'sent'],
          after: syncFrom ? new Date(syncFrom) : undefined,
          before: new Date(syncTo),
        }),
      },
      timeout: '365d',
    });

    const messagesToAnalyze: GmailMessage[] = [];
    const messagesToAnalyzeSenders = new Set<string>();

    for (const message of messages) {
      const sender = await decryptElbaInngestText(message.from);
      if (
        !messagesToAnalyzeSenders.has(message.from) &&
        shouldAnalyzeEmail({ sender, receiver: email })
      ) {
        messagesToAnalyze.push(message);
        messagesToAnalyzeSenders.add(message.from);
      }
    }

    if (messagesToAnalyze.length > 0) {
      await step.sendEvent(
        'analyze-emails',
        messagesToAnalyze.map((message) => ({
          name: 'gmail/third_party_apps.email.analyze.requested',
          data: {
            organisationId,
            region,
            userId,
            email,
            message,
            syncStartedAt,
          },
        }))
      );
    }

    const nextSyncedEmailsCount = syncedEmailsCount + messagesToAnalyze.length;
    const isLimitPerUserReached = env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      ? nextSyncedEmailsCount >= env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      : false;

    if (!isLimitPerUserReached && nextPageToken) {
      await step.sendEvent('sync-next-page', {
        name: 'gmail/third_party_apps.inbox.sync.requested',
        data: {
          ...event.data,
          syncedEmailsCount: nextSyncedEmailsCount,
          pageToken: nextPageToken,
        },
      });
      return {
        status: 'ongoing',
      };
    }

    return {
      status: 'completed',
    };
  }
);
