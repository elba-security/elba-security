import { inngest } from '@/inngest/client';
import { formatGraphMessagesFilter } from '@/connectors/microsoft/message';
import { env } from '@/common/env/server';
import { concurrencyOption } from '@/inngest/functions/common/concurrency-option';
import { listOutlookMessages } from '../microsoft/list-messages';

export type SyncMessagesRequested = {
  'outlook/third_party_apps.messages.sync.requested': {
    data: {
      organisationId: string;
      region: 'eu' | 'us';
      userId: string;
      skipStep: string | null;
      syncFrom: string | null;
      syncTo: string;
      syncStartedAt: string;
      syncedEmailsCount?: number;
      tenantId: string;
      mail: string | null;
    };
  };
};

export const syncMessages = inngest.createFunction(
  {
    id: 'sync-outlook-messages',
    concurrency: concurrencyOption,
    cancelOn: [
      {
        event: 'outlook/common.organisation.inserted',
        match: 'data.organisationId',
      },
      {
        event: 'outlook/common.remove_organisation.requested',
        match: 'data.organisationId',
      },
    ],
  },
  {
    event: 'outlook/third_party_apps.messages.sync.requested',
  },
  async ({ event, step }) => {
    const {
      skipStep,
      organisationId,
      userId,
      syncFrom,
      syncTo,
      region,
      syncStartedAt,
      syncedEmailsCount = 0,
      tenantId,
      mail,
    } = event.data;

    const { nextSkip, messages } = await step.invoke('list-messages', {
      function: listOutlookMessages,
      data: {
        tenantId,
        organisationId,
        userId,
        skipStep,
        mail,
        filter: formatGraphMessagesFilter({
          after: syncFrom ? new Date(syncFrom) : undefined,
          before: new Date(syncTo),
        }),
      },
      timeout: '3d',
    });

    const events: Parameters<typeof step.sendEvent>[1] = [];

    if (messages.length > 0) {
      events.push(
        ...messages.map(
          (message) =>
            ({
              name: 'outlook/third_party_apps.email.analyze.requested',
              data: {
                organisationId,
                region,
                userId,
                message,
                syncStartedAt,
              },
            }) as const
        )
      );
    }

    const nextSyncedEmailsCount = syncedEmailsCount + env.MESSAGES_SYNC_BATCH_SIZE;
    const isLimitPerUserReached = env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      ? nextSyncedEmailsCount >= env.SYNCED_EMAILS_COUNT_PER_USER_LIMIT
      : false;
    const status = !isLimitPerUserReached && nextSkip ? 'ongoing' : 'completed';

    if (status === 'ongoing') {
      events.push({
        name: 'outlook/third_party_apps.messages.sync.requested',
        data: {
          ...event.data,
          syncedEmailsCount: nextSyncedEmailsCount,
          skipStep: nextSkip,
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
