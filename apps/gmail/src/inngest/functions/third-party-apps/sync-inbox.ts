import { inngest } from '@/inngest/client';
import { formatListMessagesQuery } from '@/connectors/google/gmail';
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
    };
  };
};

export const syncInbox = inngest.createFunction(
  {
    id: 'sync-inbox',
    concurrency: concurrencyOption,
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
    const { email, pageToken, organisationId, userId, region, syncFrom, syncTo, syncStartedAt } =
      event.data;

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

    if (messages.length > 0) {
      await step.sendEvent(
        'sync-emails',
        messages.map(({ id }) => ({
          name: 'gmail/third_party_apps.email.sync.requested',
          data: {
            organisationId,
            region,
            userId,
            email,
            messageId: id,
            syncStartedAt,
          },
        }))
      );
    }

    const isFirstSync = !syncFrom;

    if (nextPageToken && !isFirstSync) {
      await step.sendEvent('sync-next-page', {
        name: 'gmail/third_party_apps.inbox.sync.requested',
        data: {
          ...event.data,
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
