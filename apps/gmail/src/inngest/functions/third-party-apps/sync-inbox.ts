import { inngest } from '@/inngest/client';
import { formatListMessagesQuery } from '@/connectors/google/gmail';
import { env } from '@/common/env/server';
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

    const events: Parameters<typeof step.sendEvent>[1] = [];

    if (messages.length > 0) {
      events.push(
        ...messages.map(
          (message) =>
            ({
              name: 'gmail/third_party_apps.email.analyze.requested',
              data: {
                organisationId,
                region,
                userId,
                email,
                message,
                syncStartedAt,
              },
            }) as const
        )
      );
    }

    const nextSyncedEmailsCount = syncedEmailsCount + 100;
    const isLimitPerUserReached = env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      ? nextSyncedEmailsCount >= env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      : false;
    const status = !isLimitPerUserReached && nextPageToken ? 'ongoing' : 'completed';

    if (status === 'ongoing') {
      events.push({
        name: 'gmail/third_party_apps.inbox.sync.requested',
        data: {
          ...event.data,
          syncedEmailsCount: nextSyncedEmailsCount,
          pageToken: nextPageToken ?? null,
        },
      });
    }

    if (events.length > 0) {
      await step.sendEvent('sync-next-page-and-analyze-emails', events);
    }

    return {
      status,
    };
  }
);
